///<reference path="./lib.d.ts"/>
import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  Widget
} from '@phosphor/widgets';

import {CreateVoyager} from 'datavoyager/build/lib-voyager';
import {VoyagerConfig} from 'datavoyager/build/models/config';
import 'datavoyager/build/style.css';
import {read} from 'vega-loader';


const config: VoyagerConfig  = {
  // don't allow user to select another data source from Voyager UI
  showDataSourceSelector: false
}

// We use vega-loader.read to parse the text into what vega needs,
// because this is what voyager does:
// https://github.com/vega/voyager/blob/6a02e85906956b811a1003c3ad299368d2b33a67/src/components/data-selector/index.tsx#L167
//
// So, we need to match up JupyterLab mimetypes with the format types
// for vega
const mimeTypesToVegaTypes: {[key: string]: string} = {
  'application/json': 'json',
  'text/csv': 'csv'
}


class OutputWidget extends Widget implements IRenderMime.IRenderer {
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
  }

  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    if (data === "") {
      // it is originally rendered a bunch of times with empty
      // data for some reason.
      return Promise.resolve(undefined);
    }
    try {
      const type = mimeTypesToVegaTypes[this._mimeType];
      const values = read(data, {type});
      // it might be better to create a voyager instance once in the constructor,
      // then just call update data here.
      CreateVoyager(this.node, config, {values})
    } catch (e) {
      this.node.textContent = `Failed to load file into Voyager: ${e}`;
      throw e;
    }
    return Promise.resolve(undefined);
  }

  private _mimeType: string;
}


// create a new widget factory for each file type, so that the render factory get's a different
// mime type for CSV and JSON
const fileTypes = ['csv', 'json'];

export default {
  name: 'I don\'t know what this does',
  id: 'voyager',
  rendererFactory: {
    safe: false,
    mimeTypes: Object.keys(mimeTypesToVegaTypes),
    createRenderer: options => new OutputWidget(options)
  },
  dataType: 'string',
  documentWidgetFactoryOptions: fileTypes.map((primaryFileType) => ({
    // name needs to be different or else there is an error
    name: `Voyager (${primaryFileType})`,
    primaryFileType,
    fileTypes: [primaryFileType]
  }))
} as IRenderMime.IExtension;
