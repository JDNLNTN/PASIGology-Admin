import React from 'react';
import GalleryInfoManager from '../../../components/GalleryInfoManager';

export default function EmmaculateConceptionChurchOverview() {
  return (
    <GalleryInfoManager
      table="church_info"
      title="Emmaculate Conception Church"
      textField="dialogue"
      textLabel="Info"
      newTextPlaceholder="New info..."
    />
  );
}