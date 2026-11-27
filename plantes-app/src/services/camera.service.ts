import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export type PhotoSource = 'camera' | 'gallery';

export const cameraService = {
  async takePhoto(source: PhotoSource): Promise<Blob | null> {
    const photo = await Camera.getPhoto({
      quality: 70,
      width: 1024,
      resultType: CameraResultType.Uri,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    });
    if (!photo.webPath) return null;
    const response = await fetch(photo.webPath);
    return response.blob();
  },
};
