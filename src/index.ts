///<reference path="./lib.d.ts"/>
import {
  JupyterLabPlugin,
  JupyterLab
} from '@jupyterlab/application';

import {
  ABCWidgetFactory,
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  Widget
} from '@phosphor/widgets';

import {CreateVoyager} from 'datavoyager/build/lib-voyager';
import {Data} from 'vega-lite/build/src/data';
import {VoyagerConfig} from 'datavoyager/build/models/config';
import 'datavoyager/build/style.css';
import {read} from 'vega-loader';


class VoyagerPanel extends Widget implements DocumentRegistry.IReadyWidget {
  static config: VoyagerConfig  = {
    // don't allow user to select another data source from Voyager UI
    showDataSourceSelector: false
  }
  ready = Promise.resolve();

  constructor(data: Data, fileName: string) {
    super();
    CreateVoyager(this.node, VoyagerPanel.config, data);
    this.title.label = fileName
  }

}

class VoyagerWidgetFactory extends ABCWidgetFactory<VoyagerPanel, DocumentRegistry.IModel> {
  // pass fileType into constructor so we know what it is and can pass it to vega-loader
  // to get the data
  constructor(private fileType: string, options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
  }
  createNewWidget(context: DocumentRegistry.IContext<DocumentRegistry.IModel>): VoyagerPanel {
    const data = context.model.toString();
    const values = read(data, {type: this.fileType});
    return new VoyagerPanel({values}, context.path);
  }

}

const fileTypes = ['csv', 'json'];

function activate(app: JupyterLab) {
  fileTypes.map(ft => app.docRegistry.addWidgetFactory(
    new VoyagerWidgetFactory(
      ft,
      {
        name: `Voyager (${ft})`,
        fileTypes: [ft]
      }
    )
  ))
}
const voyagerPlugin: JupyterLabPlugin<void> = {
  // NPM package name : JS object name
  id: 'jupyterlab_voyager:voyagerPlugin',
  autoStart: true,
  activate
};
export default voyagerPlugin;
