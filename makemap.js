import React from 'react';
import PropTypes from 'prop-types';
import {getTime, format} from 'date-fns';
import FeatureCounts from '../components/FeatureCounts';

// We can't import these server-side because they require "window"
const mapboxgl = process.browser ? require('mapbox-gl') : null;
//Despite using mapboxgl to render the map,
//we still use esri-leaflet to query to the layer
const { featureLayer } = process.browser ? require('esri-leaflet') : {};

const url_311 =
  'http://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/311_Boston/FeatureServer'

class Map extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pointCount: 0,
      lastUpdatedDate: '',
    };
  }

  componentDidMount() {
    //Set up esri-leaflet feature services for 311 that we query against
    //updating pointCount and lastUpdatedDate
    this.threeoneoneFeatureLayer = featureLayer({
      url: url_311,
    });

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      center: [-71.067449, 42.352568],
      zoom: 13,
      style: {
        version: 8,
        //use tiled basemap service to keep with city styling
        sources: {
          'esri-grey': {
            type: 'raster',
            tiles: [
              'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'esri-grey',
            type: 'raster',
            source: 'esri-grey',
            minzoom: 0,
            maxzoom: 20,
          },
          {
            id: 'cob-basemap',
            type: 'raster',
            source: 'cob-basemap',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
    });

    this.map.on('load', () => {
      //add 311 as geojson
      type: 'geojson',
      data: `${url_311}/query?where=1%3D1&outFields=*&outSR=4326&returnExceededLimitFeatures=true&f=pgeojson`,
    });

    
  }
}
