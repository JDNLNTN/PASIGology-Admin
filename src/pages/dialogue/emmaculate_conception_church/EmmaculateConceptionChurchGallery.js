import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function EmmaculateConceptionChurchGallery() {
  return (
    <GalleryInfoManager
      table="gallery_info_church"
      title="Gallery church info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
