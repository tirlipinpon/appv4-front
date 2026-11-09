/** La préparation de la photo vit dans shared, pour que d'autres écrans allègent une image de la même façon. */
export {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_SIDE,
  PHOTO_NOT_IMAGE,
  PHOTO_TOO_LARGE,
  acceptCroppedWebp,
  preparePhoto,
} from '../../shared/prepare-photo/prepare-photo';
export type { CroppedPhoto, PreparedPhoto } from '../../shared/prepare-photo/prepare-photo';
