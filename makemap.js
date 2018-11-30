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
        .orderBy('requested_datetime', 'DESC')
        .run((error, featureCollection) => {
          if (error) {
            console.error(error);
            return;
          }
          const mostRecentFeature = new Date(
            featureCollection.features[0].properties.requested_datetime
          );
          const lastUpdate = format(mostRecentFeature, 'MM/YYYY');
          // set last updated state for this component
          this.setState({ lastUpdatedDate: lastUpdate });
          // pass that date to the parent mapcontainer components
          // so it can be displayed under filters
          this.props.updateDatethis.state.lastUpdatedDate);
        });
    });
    // Now on line 305
    // Creating pop ups for clicking on the points
    this.map.on('click', e => {
      // Show pop up info for all crashes occurred in a clicked
      // location. This will account for stacked points

      // Get number of features at clicked location
      const features = this.map.queryRenderedFeatures(e.point);
      const numFeatures - features.length;

      if (!features.length) {
        return;
      }

      // Determine the datefield to use
      // Probably won't need this as I'm only using one dataset

      const dateField = this.props.dataset == 'trash' ? 'requested_datetime' :'date_time';


      // This date_time field above may be broken

      // Get service name and date of each request at the location
      const properties = features
        .map(feature => [
          feature.properties.service_name,
          feature.properties.requested_datetime,
        ])
        // Sort events by most-recent to least recent in pop up
        .sort((a, b) => {
          return a[1] > b[1] ? -1 : 1;
        });
    })
    // Line 335
    new mapbox1.Popup({ closeOnClick: true })
      .setLngLat(features[0].geometry.coordinates)
      // Put number of events at top of popup, and
      // for each event in aray of trash clicked on,
      // creat a new element
      .setHTML(
        `<div style="min-width: 230px">
          <div>
            <ul class="d1 d1--sm">
              <li class="dl-i dl-i--b">
                <div class="dl-d">${numFeatures} ${
          numFeatures > 1 ? 'events' : 'event'
        }</div>
              <li>
              <li class="dl-i dl-i--b">
                <div class="dl-t">
                  ${properties
                    .map(
                      trash =>
                        `${format(trash[1], 'MM/DD/YYYY, HH:MM:SS')}: ${trash[0]}<br/>`
                    )
                    .join('')}
                </div>>
              </li>
            </ul>
          </div>`
      )
      .setLngLat(features[0].geometry.coordinates)
      .addTo(this.map);
  });

  // Change mouse to a pointer when hovering over a point
  this.map.on('mousemove', e => {
    const features = this.map.queryRenderedFeatures(e.point, {
      layers: ['311-point'],
    });
    features.length > 0
      ? (this.map.getCanvas().style.cursor = 'pointer')
      : (this.map.getCanvas().style.cursor = '');
  });
}
