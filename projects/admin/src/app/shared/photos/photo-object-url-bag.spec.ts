import { PhotoObjectUrlBag } from './photo-object-url-bag';

describe('PhotoObjectUrlBag', () => {
  let createSpy: jasmine.Spy;
  let revokeSpy: jasmine.Spy;

  beforeEach(() => {
    createSpy = spyOn(URL, 'createObjectURL').and.callFake(() => `blob:mock-${createSpy.calls.count()}`);
    revokeSpy = spyOn(URL, 'revokeObjectURL');
  });

  it('révoque l’ancienne URL quand on remplace la photo du même id', () => {
    const bag = new PhotoObjectUrlBag();
    const first = bag.put(1, new Blob(['a']));
    const second = bag.put(1, new Blob(['b']));
    expect(first).toBe('blob:mock-1');
    expect(second).toBe('blob:mock-2');
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1');
  });

  it('n’accepte plus de blob après destroy', () => {
    const bag = new PhotoObjectUrlBag();
    const ticket = bag.ticket();
    bag.destroy();
    expect(bag.putIfCurrent(ticket, 1, new Blob(['x']))).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('ignore un ticket invalidé par un rechargement', () => {
    const bag = new PhotoObjectUrlBag();
    const stale = bag.ticket();
    bag.invalidate();
    expect(bag.putIfCurrent(stale, 2, new Blob(['y']))).toBeNull();
    expect(bag.snapshot()).toEqual({});
  });
});
