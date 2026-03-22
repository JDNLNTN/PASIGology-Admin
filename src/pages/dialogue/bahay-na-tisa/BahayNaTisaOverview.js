import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function BahayNaTisaGallery() {
  return (
    <GalleryInfoManager
      table="bnt_info"
      title="Bahay na tisa info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
