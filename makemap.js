import React from 'react';
import PropTypes from 'prop-types';
import {getTime, format} from 'date-fns';
import FeatureCounts from '../components/FeatureCounts';

// We can't import these server-side because they require "window"
const mapboxgl = process.browser ? require('mapbox-gl') : null;
// Despite using mapboxgl to render the map,
// we still use esri-leaflet to query to the layer
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
    // Set up esri-leaflet feature services for 311 that we query against
    // updating pointCount and lastUpdatedDate
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
      // add 311 as geojson
      this.map.addSource('311', {
        type: 'geojson',
        data: `${url_311}/query?where=1%3D1&outFields=*&outSR=4326&returnExceededLimitFeatures=true&f=pgeojson`,
      });
      // Will be adding a heatmap at further zoomed out and
      // points when zoomed in for 311 trash related incidents

      this.map.addLayer({
        id: '311-point',
        type: 'circle',
        source: '311',
        paint: {
          // Set the circle fill and color based on
          // 311 event, we will only display "Litter" or
          // "Missed Trash or Recycling" under "service_name"
          'circle-color': {
            property: 'service_name',
            type: 'categorical',
            stops: [['Litter', '#color'],['Missed Trash or Recycling','#color']]
          },
          'circle-stroke-width': 1,
          // Set opacity to appear/fade in the zoom levels outlined
          // by K to allow for heat map to show out better
          'circle-stroke-opacity': {
            stops: [[11,0], [12,1]],
          },
          'circle-opacity': {
            stops: [[11, 0], [12, 1]],
          },
        },
      });

      // Add heatmap layer for 311 trash information
      // Work on ways to implement this later
      /*
      this.map.addLayer({
        id: '311-heat',
        type: 'heatmap',
        source: '311',
        paint: {
          // Increase intensity as zoom level decreases per K's code
          'heatmap-intensity': {
            stops: [[11,1], [15,3]],
          },
        }
      });
      */

      // Set default date filters for trash 311
      const defaultFromDateFilter = [
        '>=',
        ['number', ['get', 'requested_datetime']],
        getTime(this.props.fromDate),
      ];
      const defaultToDateFilter = [
        '<=',
        ['number', ['get', 'requested_datetime']],
        getTime(this.props.toDate)
      ];
      this.map.setFilter('311-point', [
        'all',
        defaultFromDateFilter,
        defaultToDateFilter,
      ]);

      // Calculate initial pointCount value
      // See K for why this may be necessary?
      const { allModesSelected } = this.props.makeFeatures.Query(
        this.props.modeSelection,
        this.props.fromDate,
        this.props.toDate,
        this.props.dataset
      );
      this.updatePointCount(allModesSelected, this.props.dataset);

      // Query feature service to determine last update date
      this.threeoneoneFeatureLayer
        .query()
        .where('1=1')
        .orderBy('Time Submitted', 'DESC')
        .run((error, featureCollection) => {
          if (error) {
            console.error(error);
            return;
          }
          const mostRecentFeature = new Date(
            featureCollection.features[0].properties.requested_datetime
          )
        }))





    });

    //Map will show points



  }
}
