import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function PlazaRizalGallery() {
  return (
    <GalleryInfoManager
      table="plaza_rizal_info"
      title="Augmented reality Plaza Rizal info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
