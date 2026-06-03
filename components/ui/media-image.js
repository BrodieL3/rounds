import { Image as ExpoImage } from 'expo-image';
import { normalizeMediaImageSource } from '../../lib/media-image-source';

export default function MediaImage({ source, contentFit = 'cover', cachePolicy = 'memory-disk', transition = 150, ...props }) {
  return (
    <ExpoImage
      {...props}
      source={normalizeMediaImageSource(source)}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      transition={transition}
    />
  );
}
