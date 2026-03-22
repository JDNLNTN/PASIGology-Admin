import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function RevolvingTowerOverview() {
  return (
    <GalleryInfoManager
      table="gallery_info_rev"
      title="Gallery Revolving Tower info"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}
