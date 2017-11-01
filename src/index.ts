///<reference path="./lib.d.ts"/>

import {
  PathExt
} from '@jupyterlab/coreutils';
import {
  ILayoutRestorer,
  JupyterLabPlugin,
  JupyterLab
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  ABCWidgetFactory,
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  Widget
} from '@phosphor/widgets';

import { CreateVoyager } from 'datavoyager/build/lib-voyager';
import { VoyagerConfig } from 'datavoyager/build/models/config';
import 'datavoyager/build/style.css';
import { read } from 'vega-loader';


interface VoyagerPanelOptions {
  context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  fileType: string;
}

class VoyagerPanel extends Widget implements DocumentRegistry.IReadyWidget {
  static config: VoyagerConfig = {
    // don't allow user to select another data source from Voyager UI
    showDataSourceSelector: false
  }
  // it would make sense to resolve this promise after we have parsed the data
  // and created the Voyager component, but this will trigger an attempted
  // cleanup of the spinner element, which will already have been deleted
  // by the Voyager constructor and so will raise an exception.
  // So instead we just never resolve this promise, which still gives us the
  // spinner until Voyager overwrites the element.
  public ready: Promise<void> = new Promise(() => { });;

  constructor(public options: VoyagerPanelOptions) {
    super();
    const { context, fileType } = options;
    context.ready.then(_ => {
      const data = context.model.toString();
      const values = read(data, { type: fileType });
      console.log("resolved");
      CreateVoyager(this.node, VoyagerPanel.config, { values });
    })
    this.title.label = PathExt.basename(context.path);
  }

}

class VoyagerWidgetFactory extends ABCWidgetFactory<VoyagerPanel, DocumentRegistry.IModel> {
  // pass fileType into constructor so we know what it is and can pass it to vega-loader
  // to get the data
  constructor(private fileType: string, options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
  }
  createNewWidget(context: DocumentRegistry.IContext<DocumentRegistry.IModel>): VoyagerPanel {
    return new VoyagerPanel({ context, fileType: this.fileType });
  }

}

const fileTypes = ['csv', 'json'];

function activate(app: JupyterLab, restorer: ILayoutRestorer) {


  fileTypes.map(ft => {
    const factoryName = `Voyager (${ft})`;
    const tracker = new InstanceTracker<VoyagerPanel>({ namespace: `voyager-${ft}` });

    // Handle state restoration.
    restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: factoryName }),
      name: widget => widget.options.fileName
    });

    const factory = new VoyagerWidgetFactory(
      ft,
      {
        name: factoryName,
        fileTypes: [ft],
        readOnly: true
      }
    );
    app.docRegistry.addWidgetFactory(factory);
    let ftObj = app.docRegistry.getFileType(ft);

    factory.widgetCreated.connect((sender, widget) => {
      // Track the widget.
      tracker.add(widget);
      if (ftObj) {
        if (ftObj.iconClass)
          widget.title.iconClass = ftObj.iconClass;
        if (ftObj.iconLabel)
          widget.title.iconLabel = ftObj.iconLabel;
      }
    });
  });
}

const plugin: JupyterLabPlugin<void> = {
  // NPM package name : JS object name
  id: 'jupyterlab_voyager:plugin',
  autoStart: true,
  requires: [ILayoutRestorer],
  activate
};
export default plugin;
