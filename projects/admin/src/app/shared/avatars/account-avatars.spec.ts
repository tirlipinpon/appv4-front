import { ACCOUNT_AVATARS, avatarEmoji, knownAvatarEmoji, studentAvatar } from './account-avatars';

describe('account-avatars', () => {
  it('résout les six codes connus', () => {
    for (const avatar of ACCOUNT_AVATARS) {
      expect(avatarEmoji(avatar.code)).toBe(avatar.emoji);
      expect(studentAvatar(avatar.code)).toBe(avatar.emoji);
      expect(knownAvatarEmoji(avatar.code)).toBe(avatar.emoji);
    }
  });

  it('utilise le visage de secours pour un code inconnu en liste', () => {
    expect(avatarEmoji(null)).toBe('🙂');
    expect(avatarEmoji('')).toBe('🙂');
    expect(avatarEmoji('dragon')).toBe('🙂');
    expect(studentAvatar('dragon')).toBe('🙂');
  });

  it('ne met pas de secours dans le bandeau', () => {
    expect(knownAvatarEmoji(null)).toBeNull();
    expect(knownAvatarEmoji('')).toBeNull();
    expect(knownAvatarEmoji('dragon')).toBeNull();
  });
});
