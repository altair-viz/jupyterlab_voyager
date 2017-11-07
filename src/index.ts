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
import {Data} from 'vega-lite/build/src/data';
import {
  ServiceManager
} from '@jupyterlab/services';
import {
  INotebookTracker, NotebookPanel, NotebookTracker
} from '@jupyterlab/notebook';
import {
  CodeCell
} from '@jupyterlab/cells';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';
export namespace CommandIDs {
  export
  const JL_Voyager = 'voyager:Open';
}

function addCommands(app: JupyterLab, services: ServiceManager, tracker: NotebookTracker): void {
  const { commands} = app;
      // Get the current cellar widget and activate unless the args specify otherwise.
      function getCurrent(args: ReadonlyJSONObject): NotebookPanel | null {
        const widget = tracker.currentWidget;
        const activate = args['activate'] !== false;     
        if (activate && widget) {
          app.shell.activateById(widget.id);
        }
        return widget;
      }

      commands.addCommand(CommandIDs.JL_Voyager, {
        label: 'Open in Voyager',
        caption: 'Open the datasource in Voyager',
        execute: args => {
          const cur = getCurrent(args);
          if(cur){
            var filename = cur.id+'_Voyager';
            let cell = cur.notebook.activeCell;
            if(cell.model.type==='code'){
              let codeCell = (cur.notebook.activeCell as CodeCell);
              let outputs = codeCell.model.outputs;
              let i = 0;
              //find the first altair image output of this cell,
              //(if multiple output images in one cell, currently there's no method to locate, so only select the first one by default)
              while(i<outputs.length){
                if(!!outputs.get(i).data['application/vnd.vegalite.v1+json']){
                  var JSONobject = (outputs.get(i).data['application/vnd.vegalite.v1+json'] as any).data;
                  var wdg = new VoyagerPanel_DF(JSONobject, filename);
                  wdg.id = filename;
                  wdg.title.closable = true;
                  wdg.title.iconClass = 'jp-JSONIcon';
                  app.shell.addToMainArea(wdg);
                  break;
                }
                i++;
              }
            }
          }
        }
      });

}

class VoyagerPanel_DF extends Widget implements DocumentRegistry.IReadyWidget {
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

function activate(app: JupyterLab, restorer: ILayoutRestorer, tracker: NotebookTracker) {

  const services = app.serviceManager;  
  addCommands(app, services, tracker);

  //add context menu for altair image ouput
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager,
    selector: '.p-Widget.jp-RenderedVegaCommon.jp-RenderedVegaLite.vega-embed.jp-OutputArea-output'
  });

  fileTypes.map(ft => {
    const factoryName = `Voyager (${ft})`;
    const tracker = new InstanceTracker<VoyagerPanel>({ namespace: `voyager-${ft}` });

    // Handle state restoration.
    restorer.restore(tracker, {
      command: 'docmanager:open',
      args: (widget: VoyagerPanel) => ({ path: widget.options.context.path, factory: factoryName }),
      name: (widget: VoyagerPanel) => widget.options.context.path
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
  requires: [ILayoutRestorer, INotebookTracker],
  activate
};
export default plugin;
