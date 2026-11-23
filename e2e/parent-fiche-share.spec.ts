import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Partage d'une fiche entre parents : invitation, demande, transfert.
 * L'API est simulée. Deux comptes, puis un troisième qui ne doit pas voir
 * la proposition qui ne le nomme pas.
 */

const ui = {
  accountName: 'account-name',
  heading: 'child-heading',
  error: 'child-error',
  shareEmail: 'child-share-email',
  shareFirst: 'child-share-first',
  shareLast: 'child-share-last',
  shareSend: 'child-share-send',
  shareSent: 'child-share-sent',
  shareLabel: 'child-share-request-label',
  shareRefuse: 'child-share-refuse',
  invitationName: 'child-invitation',
  invitationAccept: 'child-invitation-accept',
  inviteEmail: 'child-invite-email',
  inviteSend: 'child-invite',
  inviteSent: 'child-invite-sent',
  transferHolder: 'child-transfer-holder',
  transferMessage: 'child-transfer-message',
  transferSend: 'child-transfer',
  transferIncoming: 'child-transfer-incoming',
  transferAccept: 'child-transfer-accept',
  transferRefuse: 'child-transfer-refuse',
  transferCancel: 'child-transfer-cancel',
  transferWarning: 'child-transfer-warning',
  delete: 'child-delete',
  deactivate: 'child-deactivate',
  pendingCancel: 'child-pending-cancel',
  card: (id: number) => `child-${id}`,
  invitation: (id: number) => `child-invitation-${id}`,
  share: (id: number) => `child-share-${id}`,
  transfer: (id: number) => `child-transfer-${id}`,
  shareAccept: (childId: number) => `child-share-accept-${childId}`,
} as const;

interface Account {
  id: number;
  email: string;
  displayName: string;
}

interface Fiche {
  id: number;
  firstName: string;
  lastName: string;
  referentId: number;
  holderIds: number[];
}

interface Invitation {
  id: number;
  childId: number;
  email: string;
  status: string;
}

interface Demande {
  id: number;
  senderId: number;
  referentId: number;
  firstName: string;
  lastName: string;
  status: string;
}

interface Transfer {
  id: number;
  childId: number;
  fromUserId: number;
  toUserId: number;
  message: string;
  status: string;
}

interface ShareWorld {
  actorId: number;
  accounts: Account[];
  fiches: Fiche[];
  invitations: Invitation[];
  demandes: Demande[];
  transfers: Transfer[];
  nextId: number;
}

const TEST1: Account = { id: 1, email: 'test1@exemple.fr', displayName: 'Test1' };
const BEA: Account = { id: 2, email: 'bea@exemple.fr', displayName: 'Bea' };
const NOA: Account = { id: 3, email: 'noa@exemple.fr', displayName: 'Noa' };

test.describe('Partage de fiche', { tag: ['@parent', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

  test('une invitation acceptée laisse la suivante ouverte', async ({ page }) => {
    const world = worldWith(TEST1, [fiche(1, 'Léa', 'Martin', TEST1.id)]);
    await signIn(page, world);
    await open(page, world, TEST1.id);

    const card = page.getByTestId(ui.card(1));
    await card.getByTestId(ui.inviteEmail).fill(BEA.email);
    await card.getByTestId(ui.inviteSend).click();
    await expect(card.getByTestId(ui.inviteSent)).toHaveText('Invitation envoyée');

    await card.getByTestId(ui.inviteEmail).fill(NOA.email);
    await card.getByTestId(ui.inviteSend).click();
    await expect(card.getByTestId(ui.inviteSent)).toHaveText('Invitation envoyée');

    await open(page, world, BEA.id);
    const beaInvite = page.getByTestId(ui.invitation(1));
    await expect(beaInvite.getByTestId(ui.invitationName)).toHaveText('Léa Martin');
    await beaInvite.getByTestId(ui.invitationAccept).click();
    await expect(page.getByTestId(ui.card(1))).toBeVisible();
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.delete)).toHaveCount(0);

    await open(page, world, NOA.id);
    await expect(page.getByTestId(ui.invitation(2)).getByTestId(ui.invitationName)).toHaveText('Léa Martin');
    await expect(page.getByTestId(ui.card(1))).toHaveCount(0);

    await open(page, world, TEST1.id);
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.delete)).toBeVisible();
  });

  test('deux fiches du même nom : en accepter une, refuser l autre, puis la fiche déjà reçue', async ({ page }) => {
    const world = worldWith(TEST1, [
      fiche(1, 'Léa', 'Martin', TEST1.id),
      fiche(2, 'Léa', 'Martin', TEST1.id),
    ]);
    await signIn(page, world);
    await open(page, world, BEA.id);

    await ask(page, TEST1.email, 'Léa', 'Martin');
    await expect(page.getByTestId(ui.shareSent)).toHaveText('Demande envoyée');
    await expect(page.getByTestId(ui.card(1))).toHaveCount(0);

    await open(page, world, TEST1.id);
    const request = page.getByTestId(ui.share(1));
    await expect(request.getByTestId(ui.shareLabel)).toHaveText('demande pour Léa Martin');
    await request.getByTestId(ui.shareAccept(1)).click();

    await open(page, world, BEA.id);
    await expect(page.getByTestId(ui.card(1))).toBeVisible();
    await expect(page.getByTestId(ui.card(2))).toHaveCount(0);
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.delete)).toHaveCount(0);

    await ask(page, TEST1.email, 'Léa', 'Martin');
    await open(page, world, TEST1.id);
    const again = page.getByTestId(ui.share(2));
    await expect(again.getByTestId(ui.shareAccept(2))).toBeVisible();
    await expect(again.getByTestId(ui.shareAccept(1))).toHaveCount(0);
    await again.getByTestId(ui.shareRefuse).click();

    await open(page, world, BEA.id);
    await expect(page.getByTestId(ui.card(2))).toHaveCount(0);

    await ask(page, TEST1.email, 'Léa', 'Martin');
    await open(page, world, TEST1.id);
    await page.getByTestId(ui.share(3)).getByTestId(ui.shareAccept(2)).click();

    await open(page, world, BEA.id);
    await expect(page.getByTestId(ui.card(1))).toBeVisible();
    await expect(page.getByTestId(ui.card(2))).toBeVisible();
    await ask(page, TEST1.email, 'Léa', 'Martin');
    await expect(page.getByTestId(ui.error)).toHaveText('Cette fiche est déjà chez vous.');
  });

  test('le transfert nomme un parent parmi plusieurs, se refuse, s annule, puis s accepte', async ({ page }) => {
    const world = worldWith(TEST1, [fiche(1, 'Akira', 'Sterezynski', TEST1.id, [BEA.id, NOA.id])]);
    await signIn(page, world);
    await open(page, world, TEST1.id);

    const card = page.getByTestId(ui.card(1));
    await expect(card.getByTestId(ui.transferHolder)).toContainText('Bea');
    await expect(card.getByTestId(ui.transferHolder)).toContainText('Noa');
    await card.getByTestId(ui.transferSend).click();
    await expect(page.getByTestId(ui.error)).toHaveText('Le message est manquant.');

    await card.getByTestId(ui.transferHolder).selectOption({ label: 'Bea' });
    await card.getByTestId(ui.transferMessage).fill('x'.repeat(201));
    await card.getByTestId(ui.transferSend).click();
    await expect(page.getByTestId(ui.error)).toHaveText('Le message doit faire au plus 200 caractères.');

    await card.getByTestId(ui.transferMessage).fill('Tu la gères ?');
    await card.getByTestId(ui.transferSend).click();

    await open(page, world, NOA.id);
    await expect(page.getByTestId(ui.transferIncoming)).toHaveCount(0);
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.transferSend)).toHaveCount(0);

    await open(page, world, BEA.id);
    const incoming = page.getByTestId(ui.transfer(1));
    await expect(incoming.getByTestId(ui.transferIncoming)).toHaveText('Tu la gères ?');
    await incoming.getByTestId(ui.transferRefuse).click();

    await open(page, world, TEST1.id);
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.delete)).toBeVisible();
    await page.getByTestId(ui.card(1)).getByTestId(ui.transferHolder).selectOption({ label: 'Bea' });
    await page.getByTestId(ui.card(1)).getByTestId(ui.transferMessage).fill('Encore');
    await page.getByTestId(ui.card(1)).getByTestId(ui.transferSend).click();
    await page.getByTestId(ui.card(1)).getByTestId(ui.transferCancel).click();

    await open(page, world, BEA.id);
    await expect(page.getByTestId(ui.transferIncoming)).toHaveCount(0);

    await open(page, world, TEST1.id);
    await page.getByTestId(ui.card(1)).getByTestId(ui.transferHolder).selectOption({ label: 'Bea' });
    await page.getByTestId(ui.card(1)).getByTestId(ui.transferMessage).fill('Tu la gères ?');
    await page.getByTestId(ui.card(1)).getByTestId(ui.transferSend).click();
    await page.getByTestId(ui.card(1)).getByTestId(ui.delete).click();
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.transferWarning)).toContainText(
      "Un transfert est en attente. Retirer la fiche l'annulera.",
    );
    await page.getByTestId(ui.card(1)).getByTestId(ui.pendingCancel).click();
    await page.getByTestId(ui.card(1)).getByTestId(ui.deactivate).click();
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.transferWarning)).toHaveCount(0);
    await page.getByTestId(ui.card(1)).getByTestId(ui.pendingCancel).click();

    await open(page, world, BEA.id);
    await page.getByTestId(ui.transfer(3)).getByTestId(ui.transferAccept).click();
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.delete)).toBeVisible();
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.transferHolder)).toContainText('Test1');
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.transferHolder)).toContainText('Noa');

    await open(page, world, TEST1.id);
    await expect(page.getByTestId(ui.card(1))).toBeVisible();
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.delete)).toHaveCount(0);
    await expect(page.getByTestId(ui.accountName)).toHaveText('Test1');

    await open(page, world, NOA.id);
    await expect(page.getByTestId(ui.card(1))).toBeVisible();
    await expect(page.getByTestId(ui.card(1)).getByTestId(ui.delete)).toHaveCount(0);
  });
});

function worldWith(referent: Account, fiches: Fiche[]): ShareWorld {
  return {
    actorId: referent.id,
    accounts: [TEST1, BEA, NOA],
    fiches,
    invitations: [],
    demandes: [],
    transfers: [],
    nextId: 1,
  };
}

function fiche(id: number, firstName: string, lastName: string, referentId: number, holderIds: number[] = []): Fiche {
  return { id, firstName, lastName, referentId, holderIds };
}

async function signIn(page: Page, world: ShareWorld): Promise<void> {
  await page.addInitScript((token) => {
    sessionStorage.setItem('admin.jwt', token);
  }, jwt());
  await page.route('**/api/int/**', async (route) => handleApi(route, world));
}

async function open(page: Page, world: ShareWorld, accountId: number): Promise<void> {
  world.actorId = accountId;
  await page.goto('/parent/enfants');
  await expect(page.getByTestId(ui.heading)).toBeVisible();
  await expect(page.getByTestId(ui.accountName)).toHaveText(account(world, accountId).displayName);
}

async function ask(page: Page, email: string, firstName: string, lastName: string): Promise<void> {
  await page.getByTestId(ui.shareEmail).fill(email);
  await page.getByTestId(ui.shareFirst).fill(firstName);
  await page.getByTestId(ui.shareLast).fill(lastName);
  await page.getByTestId(ui.shareSend).click();
}

function jwt(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(JSON.stringify({ exp, activeRole: 'parent', roles: ['parent'] })).toString('base64url');
  return `e30.${body}.sig`;
}

async function handleApi(route: Route, world: ShareWorld): Promise<void> {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace(/^.*\/api\/int/, '');
  const method = request.method();
  const actor = account(world, world.actorId);

  if (path === '/auth/me' && method === 'GET') {
    await json(route, 200, { displayName: actor.displayName, avatarCode: null });
    return;
  }
  if (path === '/auth/spaces' && method === 'GET') {
    await json(route, 200, { roles: ['parent'], teacherRequest: 'none' });
    return;
  }
  if (path === '/parent/children/invitations' && method === 'GET') {
    await json(route, 200, invitationsFor(world, actor.email));
    return;
  }
  const acceptedInvitation = path.match(/^\/parent\/children\/invitations\/(\d+)\/accept$/);
  if (acceptedInvitation && method === 'POST') {
    acceptInvitation(world, Number(acceptedInvitation[1]), actor);
    await json(route, 200, null);
    return;
  }
  if (path === '/parent/children/demandes' && method === 'GET') {
    await json(route, 200, demandesFor(world, actor.id));
    return;
  }
  if (path === '/parent/children/demandes' && method === 'POST') {
    await json(route, ...requestShare(world, actor.id, request.postDataJSON() as ShareBody));
    return;
  }
  const demandeAction = path.match(/^\/parent\/children\/demandes\/(\d+)(?:\/(accept|refuse))?$/);
  if (demandeAction) {
    const id = Number(demandeAction[1]);
    const action = demandeAction[2];
    if (method === 'POST' && action === 'accept') {
      const body = request.postDataJSON() as { childId?: number };
      acceptDemande(world, id, actor.id, body.childId ?? 0);
      await json(route, 200, null);
      return;
    }
    if (method === 'POST' && action === 'refuse') {
      mark(world.demandes, id, 'refused');
      await json(route, 200, null);
      return;
    }
  }
  if (path === '/parent/children/transferts' && method === 'GET') {
    await json(route, 200, transfersFor(world, actor.id));
    return;
  }
  const transferAction = path.match(/^\/parent\/children\/transferts\/(\d+)(?:\/(accept|refuse))?$/);
  if (transferAction) {
    const id = Number(transferAction[1]);
    const action = transferAction[2];
    if (method === 'POST' && action === 'accept') {
      acceptTransfer(world, id, actor.id);
      await json(route, 200, null);
      return;
    }
    if (method === 'POST' && action === 'refuse') {
      mark(world.transfers, id, 'refused');
      await json(route, 200, null);
      return;
    }
    if (method === 'DELETE') {
      mark(world.transfers, id, 'cancelled');
      await json(route, 200, null);
      return;
    }
  }
  const childAction = path.match(/^\/parent\/children\/(\d+)(?:\/(holders|invitations|transferts))?$/);
  if (childAction) {
    const childId = Number(childAction[1]);
    const action = childAction[2];
    if (method === 'GET' && action === 'holders') {
      await json(route, ...holders(world, actor.id, childId));
      return;
    }
    if (method === 'POST' && action === 'invitations') {
      const body = request.postDataJSON() as { email?: string };
      await json(route, ...invite(world, actor.id, childId, body.email ?? ''));
      return;
    }
    if (method === 'POST' && action === 'transferts') {
      const body = request.postDataJSON() as { holderUserId?: number; message?: string };
      await json(route, ...startTransfer(world, actor.id, childId, body.holderUserId ?? 0, body.message ?? ''));
      return;
    }
  }
  if (path === '/parent/children' && method === 'GET') {
    await json(route, 200, { children: visible(world, actor.id), schools: [], curricula: [] });
    return;
  }
  await json(route, 200, {});
}

interface ShareBody {
  email?: string;
  firstName?: string;
  lastName?: string;
}

function invitationsFor(world: ShareWorld, email: string): unknown[] {
  return world.invitations
    .filter((item) => item.status === 'pending' && item.email === email.trim().toLowerCase())
    .map((item) => {
      const child = ficheById(world, item.childId);
      return { id: item.id, childId: item.childId, firstName: child.firstName, lastName: child.lastName };
    });
}

function acceptInvitation(world: ShareWorld, id: number, actor: Account): void {
  const invitation = world.invitations.find((item) => item.id === id && item.status === 'pending');
  if (!invitation || invitation.email !== actor.email) {
    return;
  }
  invitation.status = 'accepted';
  const child = ficheById(world, invitation.childId);
  if (child.referentId !== actor.id && !child.holderIds.includes(actor.id)) {
    child.holderIds.push(actor.id);
  }
}

function requestShare(world: ShareWorld, senderId: number, body: ShareBody): [number, unknown] {
  const email = (body.email ?? '').trim().toLowerCase();
  const firstName = (body.firstName ?? '').trim();
  const lastName = (body.lastName ?? '').trim();
  const sent: [number, unknown] = [200, { message: 'Demande envoyée' }];
  if (!email || !firstName || !lastName) {
    return sent;
  }
  const referent = world.accounts.find((item) => item.email === email);
  if (!referent) {
    return sent;
  }
  const matches = world.fiches.filter((child) =>
    child.referentId === referent.id && sameName(child, firstName, lastName));
  if (matches.length === 0) {
    return sent;
  }
  if (matches.every((child) => holds(child, senderId))) {
    return [400, { message: 'Cette fiche est déjà chez vous.' }];
  }
  const pending = world.demandes.some((item) =>
    item.status === 'pending'
    && item.senderId === senderId
    && item.referentId === referent.id
    && sameText(item.firstName, firstName)
    && sameText(item.lastName, lastName));
  if (!pending) {
    world.demandes.push({
      id: world.nextId++,
      senderId,
      referentId: referent.id,
      firstName,
      lastName,
      status: 'pending',
    });
  }
  return sent;
}

function demandesFor(world: ShareWorld, referentId: number): unknown[] {
  return world.demandes
    .filter((item) => item.status === 'pending' && item.referentId === referentId)
    .map((item) => ({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      matches: world.fiches
        .filter((child) =>
          child.referentId === referentId
          && sameName(child, item.firstName, item.lastName)
          && !holds(child, item.senderId))
        .map((child) => ({ childId: child.id, firstName: child.firstName, lastName: child.lastName })),
    }))
    .filter((item) => item.matches.length > 0);
}

function acceptDemande(world: ShareWorld, id: number, referentId: number, childId: number): void {
  const demande = world.demandes.find((item) => item.id === id && item.status === 'pending');
  const child = world.fiches.find((item) => item.id === childId);
  if (!demande || !child || child.referentId !== referentId || !sameName(child, demande.firstName, demande.lastName)) {
    return;
  }
  if (!child.holderIds.includes(demande.senderId)) {
    child.holderIds.push(demande.senderId);
  }
  demande.status = 'accepted';
}

function holders(world: ShareWorld, actorId: number, childId: number): [number, unknown] {
  const child = ficheById(world, childId);
  if (child.referentId !== actorId) {
    return [400, { message: 'Seul le parent référent peut faire ça.' }];
  }
  return [200, child.holderIds.map((id) => ({ userId: id, label: account(world, id).displayName }))];
}

function invite(world: ShareWorld, actorId: number, childId: number, email: string): [number, unknown] {
  const child = ficheById(world, childId);
  if (child.referentId !== actorId) {
    return [400, { message: 'Seul le parent référent peut faire ça.' }];
  }
  const normalized = email.trim().toLowerCase();
  if (world.invitations.some((item) => item.status === 'pending' && item.childId === childId && item.email === normalized)) {
    return [400, { message: 'Une invitation est déjà en attente pour cet email.' }];
  }
  world.invitations.push({ id: world.nextId++, childId, email: normalized, status: 'pending' });
  return [200, { message: 'Invitation envoyée' }];
}

function startTransfer(
  world: ShareWorld,
  actorId: number,
  childId: number,
  holderUserId: number,
  message: string,
): [number, unknown] {
  const child = ficheById(world, childId);
  if (child.referentId !== actorId) {
    return [400, { message: 'Seul le parent référent peut faire ça.' }];
  }
  const text = message.trim();
  if (!text) {
    return [400, { message: 'Le message est manquant.' }];
  }
  if (text.length > 200) {
    return [400, { message: 'Le message doit faire au plus 200 caractères.' }];
  }
  if (world.transfers.some((item) => item.status === 'pending' && item.childId === childId)) {
    return [400, { message: 'Un transfert est déjà en attente.' }];
  }
  if (!child.holderIds.includes(holderUserId)) {
    return [400, { message: 'Cet enfant est introuvable.' }];
  }
  world.transfers.push({
    id: world.nextId++,
    childId,
    fromUserId: actorId,
    toUserId: holderUserId,
    message: text,
    status: 'pending',
  });
  return [200, null];
}

function transfersFor(world: ShareWorld, actorId: number): unknown[] {
  return world.transfers
    .filter((item) => item.status === 'pending' && (item.fromUserId === actorId || item.toUserId === actorId))
    .map((item) => {
      const child = ficheById(world, item.childId);
      return {
        id: item.id,
        childId: item.childId,
        firstName: child.firstName,
        lastName: child.lastName,
        message: item.message,
        incoming: item.toUserId === actorId,
      };
    });
}

function acceptTransfer(world: ShareWorld, id: number, actorId: number): void {
  const transfer = world.transfers.find((item) => item.id === id && item.status === 'pending');
  if (!transfer || transfer.toUserId !== actorId) {
    return;
  }
  const child = ficheById(world, transfer.childId);
  const previous = child.referentId;
  child.referentId = actorId;
  child.holderIds = child.holderIds.filter((holderId) => holderId !== actorId);
  if (previous !== actorId && !child.holderIds.includes(previous)) {
    child.holderIds.push(previous);
  }
  transfer.status = 'accepted';
}

function visible(world: ShareWorld, actorId: number): unknown[] {
  return world.fiches.filter((child) => holds(child, actorId)).map((child) => ({
    id: child.id,
    firstName: child.firstName,
    lastName: child.lastName,
    sex: 'FILLE',
    age: 8,
    country: 'Belgique',
    grade: '4e primaire',
    schoolName: 'École Nouvelle',
    avatarCode: 'fox',
    hasPhoto: false,
    active: true,
    links: [],
    interests: [],
    schoolSubjectCount: 0,
    extraSubjectCount: 0,
    referent: child.referentId === actorId,
    pendingInvitationCount: child.referentId === actorId ? pendingInvitations(world, child.id) : 0,
    pendingDemandeCount: child.referentId === actorId ? pendingDemandes(world, child) : 0,
    pendingTransferCount: child.referentId === actorId && pendingTransfer(world, child.id) ? 1 : 0,
  }));
}

function pendingInvitations(world: ShareWorld, childId: number): number {
  return world.invitations.filter((item) => item.status === 'pending' && item.childId === childId).length;
}

function pendingDemandes(world: ShareWorld, child: Fiche): number {
  return world.demandes.filter((item) =>
    item.status === 'pending'
    && item.referentId === child.referentId
    && sameName(child, item.firstName, item.lastName)).length;
}

function pendingTransfer(world: ShareWorld, childId: number): boolean {
  return world.transfers.some((item) => item.status === 'pending' && item.childId === childId);
}

function holds(child: Fiche, userId: number): boolean {
  return child.referentId === userId || child.holderIds.includes(userId);
}

function sameName(child: Fiche, firstName: string, lastName: string): boolean {
  return sameText(child.firstName, firstName) && sameText(child.lastName, lastName);
}

function sameText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function ficheById(world: ShareWorld, id: number): Fiche {
  const child = world.fiches.find((item) => item.id === id);
  if (!child) {
    throw new Error(`fiche ${id}`);
  }
  return child;
}

function account(world: ShareWorld, id: number): Account {
  const found = world.accounts.find((item) => item.id === id);
  if (!found) {
    throw new Error(`compte ${id}`);
  }
  return found;
}

function mark(rows: { id: number; status: string }[], id: number, status: string): void {
  const row = rows.find((item) => item.id === id);
  if (row) {
    row.status = status;
  }
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
