import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function RevolvingTowerGallery() {
  return (
    <GalleryInfoManager
      table="rev_info"
      title="Gallery Revolving Tower info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
