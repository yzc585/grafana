import React, { PureComponent } from 'react';
import $ from 'jquery';

import { ValueMapping, Threshold, Theme, MappingType, BasicGaugeColor, Themes } from '../../types/panel';
import { TimeSeriesVMs } from '../../types/series';
import { getValueFormat } from '../../utils/valueFormats/valueFormats';

export interface Props {
  decimals: number;
  height: number;
  valueMappings: ValueMapping[];
  maxValue: number;
  minValue: number;
  prefix: string;
  timeSeries: TimeSeriesVMs;
  thresholds: Threshold[];
  showThresholdMarkers: boolean;
  showThresholdLabels: boolean;
  stat: string;
  suffix: string;
  unit: string;
  width: number;
  theme?: Theme;
}

export class Gauge extends PureComponent<Props> {
  canvasElement: any;

  static defaultProps = {
    maxValue: 100,
    valueMappings: [],
    minValue: 0,
    prefix: '',
    showThresholdMarkers: true,
    showThresholdLabels: false,
    suffix: '',
    thresholds: [],
    unit: 'none',
    stat: 'avg',
  };

  componentDidMount() {
    this.draw();
  }

  componentDidUpdate() {
    this.draw();
  }

  formatWithMappings(mappings, value) {
    const valueMaps = mappings.filter(m => m.type === MappingType.ValueToText);
    const rangeMaps = mappings.filter(m => m.type === MappingType.RangeToText);

    const valueMap = valueMaps.map(mapping => {
      if (mapping.value && value === mapping.value) {
        return mapping.text;
      }
    })[0];

    const rangeMap = rangeMaps.map(mapping => {
      if (mapping.from && mapping.to && value > mapping.from && value < mapping.to) {
        return mapping.text;
      }
    })[0];

    return { rangeMap, valueMap };
  }

  formatValue(value) {
    const { decimals, valueMappings, prefix, suffix, unit } = this.props;

    const formatFunc = getValueFormat(unit);
    const formattedValue = formatFunc(value, decimals);

    if (valueMappings.length > 0) {
      const { rangeMap, valueMap } = this.formatWithMappings(valueMappings, formattedValue);

      if (valueMap) {
        return `${prefix} ${valueMap} ${suffix}`;
      } else if (rangeMap) {
        return `${prefix} ${rangeMap} ${suffix}`;
      }
    }

    if (isNaN(value)) {
      return value;
    }

    return `${prefix} ${formattedValue} ${suffix}`;
  }

  getFontColor(value: string | number) {
    const { thresholds } = this.props;

    if (thresholds.length === 1) {
      return thresholds[0].color;
    }

    const atThreshold = thresholds.filter(threshold => value < threshold.value);

    if (atThreshold.length > 0) {
      const nearestThreshold = atThreshold.sort((t1, t2) => t1.value - t2.value)[0];
      return nearestThreshold.color;
    }

    return BasicGaugeColor.Red;
  }

  draw() {
    const {
      maxValue,
      minValue,
      timeSeries,
      showThresholdLabels,
      showThresholdMarkers,
      thresholds,
      width,
      height,
      stat,
      theme,
    } = this.props;

    let value: string | number = '';

    if (timeSeries[0]) {
      value = timeSeries[0].stats[stat];
    } else {
      value = 'N/A';
    }

    const dimension = Math.min(width, height * 1.3);
    const backgroundColor = theme === Themes.Light ? 'rgb(230,230,230)' : 'rgb(38,38,38)';
    const fontScale = parseInt('80', 10) / 100;
    const fontSize = Math.min(dimension / 5, 100) * fontScale;
    const gaugeWidthReduceRatio = showThresholdLabels ? 1.5 : 1;
    const gaugeWidth = Math.min(dimension / 6, 60) / gaugeWidthReduceRatio;
    const thresholdMarkersWidth = gaugeWidth / 5;
    const thresholdLabelFontSize = fontSize / 2.5;

    const formattedThresholds = [
      { value: minValue, color: thresholds.length === 1 ? thresholds[0].color : BasicGaugeColor.Green },
      ...thresholds.map((threshold, index) => {
        return {
          value: threshold.value,
          color: thresholds[index].color,
        };
      }),
      { value: maxValue, color: thresholds.length === 1 ? thresholds[0].color : BasicGaugeColor.Red },
    ];

    const options = {
      series: {
        gauges: {
          gauge: {
            min: minValue,
            max: maxValue,
            background: { color: backgroundColor },
            border: { color: null },
            shadow: { show: false },
            width: gaugeWidth,
          },
          frame: { show: false },
          label: { show: false },
          layout: { margin: 0, thresholdWidth: 0 },
          cell: { border: { width: 0 } },
          threshold: {
            values: formattedThresholds,
            label: {
              show: showThresholdLabels,
              margin: thresholdMarkersWidth + 1,
              font: { size: thresholdLabelFontSize },
            },
            show: showThresholdMarkers,
            width: thresholdMarkersWidth,
          },
          value: {
            color: this.getFontColor(value),
            formatter: () => {
              return this.formatValue(value);
            },
            font: { size: fontSize, family: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
          },
          show: true,
        },
      },
    };

    const plotSeries = { data: [[0, value]] };

    try {
      $.plot(this.canvasElement, [plotSeries], options);
    } catch (err) {
      console.log('Gauge rendering error', err, options, timeSeries);
    }
  }

  render() {
    const { height, width } = this.props;

    return (
      <div className="singlestat-panel">
        <div
          style={{
            height: `${height * 0.9}px`,
            width: `${Math.min(width, height * 1.3)}px`,
            top: '10px',
            margin: 'auto',
          }}
          ref={element => (this.canvasElement = element)}
        />
      </div>
    );
  }
}

export default Gauge;
