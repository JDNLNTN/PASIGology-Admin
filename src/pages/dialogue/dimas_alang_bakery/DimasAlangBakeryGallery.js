import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function DimasAlangBakeryGallery() {
  return (
    <GalleryInfoManager
      table="da_info"
      title="Dimas Alang Bakery"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
