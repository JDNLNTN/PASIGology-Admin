import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function DimasAlangBakeryGallery() {
  return (
    <GalleryInfoManager
      table="gallery_info_da"
      title="Gallery Dimas alang info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
