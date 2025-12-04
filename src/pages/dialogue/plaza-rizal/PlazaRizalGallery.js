import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function PlazaRizalGallery() {
  return (
    <GalleryInfoManager
      table="gallery_info_rizal"
      title="Gallery Plaza Rizal info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
