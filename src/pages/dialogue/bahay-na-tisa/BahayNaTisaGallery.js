import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function BahayNaTisaGallery() {
  return (
    <GalleryInfoManager
      table="gallery_info_bnt"
      title="Gallery Bahay na tisa info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
