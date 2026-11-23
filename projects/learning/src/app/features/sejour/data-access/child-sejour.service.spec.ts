import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ChildSejourService } from './child-sejour.service';

describe('ChildSejourService', () => {
  let service: ChildSejourService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.setItem('learning.jwt', 'child-token');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChildSejourService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stop();
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('envoie le code accueil et l’appareil conservé pour Home', () => {
    localStorage.setItem('learning.deviceId', 'tablette-1');

    service.enter('/home');

    const sent = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(sent.request.method).toBe('POST');
    expect(sent.request.headers.get('Authorization')).toBe('Bearer child-token');
    expect(sent.request.body).toEqual({
      kind: 'screen',
      deviceId: 'tablette-1',
      screen: 'accueil',
    });
    sent.flush(null);
    flushRead();
  });

  it('envoie le code de chaque écran, et pas un code pour la partie', () => {
    localStorage.setItem('learning.deviceId', 'tablette-1');
    const screens: { url: string; screen: string }[] = [
      { url: '/learn', screen: 'matieres' },
      { url: '/learn/12', screen: 'board' },
      { url: '/learn/12/questions', screen: 'questions' },
      { url: '/rewards', screen: 'recompenses' },
      { url: '/ranking', screen: 'classement' },
      { url: '/profile', screen: 'profil' },
    ];

    for (const item of screens) {
      service.enter(item.url);
      const sent = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
      expect(sent.request.body).toEqual({
        kind: 'screen',
        deviceId: 'tablette-1',
        screen: item.screen,
      });
      sent.flush(null);
      flushRead();
    }

    service.enter('/learn/12/play/9');
    const play = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(play.request.body).toEqual({
      kind: 'question',
      deviceId: 'tablette-1',
      questionId: 9,
    });
    play.flush(null);
    flushRead();
  });

  it('envoie la question de la partie, puis l’écran suivant, et se tait si le séjour n’est plus tenu', () => {
    localStorage.setItem('learning.deviceId', 'tablette-1');

    service.enter('/learn/12/play/9');

    const question = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(question.request.body).toEqual({
      kind: 'question',
      deviceId: 'tablette-1',
      questionId: 9,
    });
    question.flush(null);
    flushRead(false);

    service.enter('/learn/12/play/10');
    http.expectNone('http://localhost:8080/api/ext/sejour/signals');

    service.enter('/learn/12');
    const board = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(board.request.body).toEqual({
      kind: 'screen',
      deviceId: 'tablette-1',
      screen: 'board',
    });
    board.flush(null);
    flushRead();
  });

  it('laisse la popup d’humeur sur accueil, sans un second code', () => {
    localStorage.setItem('learning.deviceId', 'tablette-1');

    service.enter('/home');
    const sent = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(sent.request.body).toEqual({
      kind: 'screen',
      deviceId: 'tablette-1',
      screen: 'accueil',
    });
    sent.flush(null);
    flushRead();

    service.enter('/home');
    http.expectNone('http://localhost:8080/api/ext/sejour/signals');
  });

  it('crée un seul appareil opaque et le renvoie au changement d’écran', () => {
    service.enter('/home');
    const home = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    const deviceId = (home.request.body as { deviceId: string }).deviceId;
    expect(deviceId.length).toBeGreaterThan(0);
    expect(localStorage.getItem('learning.deviceId')).toBe(deviceId);
    home.flush(null);
    flushRead();

    service.enter('/learn');
    const learn = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(learn.request.body).toEqual({
      kind: 'screen',
      deviceId,
      screen: 'matieres',
    });
    learn.flush(null);
    flushRead();
  });

  it('envoie un geste sur l’écran courant, sans un autre écran', () => {
    localStorage.setItem('learning.deviceId', 'tablette-1');
    service.enter('/rewards');
    http.expectOne('http://localhost:8080/api/ext/sejour/signals').flush(null);
    flushRead();

    service.gesture();

    const sent = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(sent.request.body).toEqual({
      kind: 'gesture',
      deviceId: 'tablette-1',
      screen: 'recompenses',
    });
    sent.flush(null);
    service.gesture();
    const again = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(again.request.body).toEqual({
      kind: 'gesture',
      deviceId: 'tablette-1',
      screen: 'recompenses',
    });
    again.flush(null);
  });

  it('envoie une présence toutes les 30 secondes, sans qu’un geste relance le délai', fakeAsync(() => {
    localStorage.setItem('learning.deviceId', 'tablette-1');
    service.enter('/ranking');
    http.expectOne('http://localhost:8080/api/ext/sejour/signals').flush(null);
    flushRead();

    tick(20_000);
    service.gesture();
    const gesture = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(gesture.request.body).toEqual({
      kind: 'gesture',
      deviceId: 'tablette-1',
      screen: 'classement',
    });
    gesture.flush(null);

    tick(10_000);
    flushRead();
    const presence = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(presence.request.body).toEqual({
      kind: 'presence',
      deviceId: 'tablette-1',
      screen: 'classement',
    });
    presence.flush(null);

    tick(30_000);
    flushRead();
    const later = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(later.request.body).toEqual({
      kind: 'presence',
      deviceId: 'tablette-1',
      screen: 'classement',
    });
    later.flush(null);
    service.stop();
  }));

  it('envoie leave quand l’écran se cache, puis plus de présence', fakeAsync(() => {
    localStorage.setItem('learning.deviceId', 'tablette-1');
    service.enter('/profile');
    http.expectOne('http://localhost:8080/api/ext/sejour/signals').flush(null);
    flushRead();

    service.hide();

    const leave = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(leave.request.body).toEqual({
      kind: 'leave',
      deviceId: 'tablette-1',
      screen: 'profil',
    });
    leave.flush(null);

    tick(30_000);
    http.expectNone('http://localhost:8080/api/ext/sejour/signals');

    service.show();
    const back = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(back.request.body).toEqual({
      kind: 'screen',
      deviceId: 'tablette-1',
      screen: 'profil',
    });
    back.flush(null);
    flushRead();
    tick(30_000);
    flushRead();
    const presence = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(presence.request.body).toEqual({
      kind: 'presence',
      deviceId: 'tablette-1',
      screen: 'profil',
    });
    presence.flush(null);
    service.stop();
  }));

  it('cesse les présences quand la lecture dit que cet appareil ne tient plus le séjour', fakeAsync(() => {
    localStorage.setItem('learning.deviceId', 'tablette-1');
    service.enter('/home');
    http.expectOne('http://localhost:8080/api/ext/sejour/signals').flush(null);

    const read = http.expectOne(
      (req) => req.method === 'GET' && req.url === 'http://localhost:8080/api/ext/sejour',
    );
    expect(read.request.headers.get('Authorization')).toBe('Bearer child-token');
    expect(read.request.params.get('deviceId')).toBe('tablette-1');
    read.flush({ holds: false, message: undefined });

    tick(30_000);
    http.expectNone('http://localhost:8080/api/ext/sejour/signals');

    service.gesture();
    const gesture = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(gesture.request.body).toEqual({
      kind: 'gesture',
      deviceId: 'tablette-1',
      screen: 'accueil',
    });
    gesture.flush(null);
    http
      .expectOne((req) => req.method === 'GET' && req.url === 'http://localhost:8080/api/ext/sejour')
      .flush({ holds: true });

    tick(30_000);
    const readAgain = http.expectOne(
      (req) => req.method === 'GET' && req.url === 'http://localhost:8080/api/ext/sejour',
    );
    readAgain.flush({ holds: true });
    const presence = http.expectOne('http://localhost:8080/api/ext/sejour/signals');
    expect(presence.request.body).toEqual({
      kind: 'presence',
      deviceId: 'tablette-1',
      screen: 'accueil',
    });
    presence.flush(null);
    service.stop();
  }));

  function flushRead(holds = true): void {
    http
      .expectOne((req) => req.method === 'GET' && req.url === 'http://localhost:8080/api/ext/sejour')
      .flush({ holds });
  }
});
