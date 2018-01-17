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
  ICommandPalette,InstanceTracker
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
  INotebookTracker, NotebookPanel, NotebookTracker
} from '@jupyterlab/notebook';
import {
  CodeCell
} from '@jupyterlab/cells';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import '../style/index.css';
import { Message } from '@phosphor/messaging';
export namespace CommandIDs {
  export
  const JL_Graph_Voyager = 'graph_voyager:open';
  export
  const JL_Table_Voyager = 'table_voyager:open';
  export
  const JL_TESTOPEN = 'xkcd test:open';
}

class VoyagerPanel_DF extends Widget /*implements DocumentRegistry.IReadyWidget */{
  static config: VoyagerConfig  = {
    // don't allow user to select another data source from Voyager UI
    showDataSourceSelector: false
  }
  public ready: Promise<void> = new Promise(() => { });
 
  constructor(public options: VoyagerPanel_DF_Options) {
    super();
    const { data, fileName } = options;
    this.title.label = fileName;
    this.data_source = data;
    console.log("just check for re-active!!");
    CreateVoyager(this.node, VoyagerPanel.config, this.data_source);
  }

  onUpdateRequest(msg:Message):void{
    console.log("Onupdate: just check for re-active!!");
    CreateVoyager(this.node, VoyagerPanel.config, this.data_source);

  };
 readonly data_source:Data;

}

interface VoyagerPanel_DF_Options {
  data: Data;
  fileName: string
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
  public ready: Promise<void> = new Promise(() => { });

  constructor(public options: VoyagerPanelOptions) {
    super();
    const { context, fileType } = options;
    context.ready.then(_ => {
      const data = context.model.toString();
      var values;
      values = read(data, { type: fileType });

      if(fileType==='json'){
        if(values['data']){
          var DATA = values['data'];
          console.log(values['data']);
          if(DATA['url']){ //check if it's url type datasource
            CreateVoyager(this.node, VoyagerPanel.config, values['data']);
          }
          else if(DATA['values']){ //check if it's array value data source
            CreateVoyager(this.node, VoyagerPanel.config, values['data']);
          }
        }
        else{ //other conditions, just try to pass the value to voyager and wish the best
          CreateVoyager(this.node, VoyagerPanel.config, { values });
        }
      }
      else{
        CreateVoyager(this.node, VoyagerPanel.config, { values });
      }
    })
    this.title.label = PathExt.basename(context.path);
  }
  onUpdateRequest(): void {
    fetch('https://egszlpbmle.execute-api.us-east-1.amazonaws.com/prod').then(response => {
      return response.json();
    }).then();
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

const fileTypes = ['csv', 'json', 'tsv'];

function activate(app: JupyterLab, restorer: ILayoutRestorer, tracker: NotebookTracker,palette: ICommandPalette) {

  let wdg:VoyagerPanel_DF;
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

  commands.addCommand(CommandIDs.JL_Graph_Voyager, {
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
          console.log(outputs);
          let i = 0;
          //find the first altair image output of this cell,
          //(if multiple output images in one cell, currently there's no method to locate, so only select the first one by default)
          while(i<outputs.length){
            if(!!outputs.get(i).data['application/vnd.vegalite.v1+json']){
              var JSONobject = (outputs.get(i).data['application/vnd.vegalite.v1+json'] as any).data;
              console.log(JSONobject)
              wdg = new VoyagerPanel_DF({data:JSONobject,fileName:filename});
              wdg.id = filename;
              wdg.title.closable = true;
              wdg.title.iconClass = 'jp-JSONIcon';
              app.shell.addToMainArea(wdg);
              app.shell.activateById(wdg.id);
              break;
            }
            i++;
          }
        }
      }
    }
  });


  commands.addCommand(CommandIDs.JL_Table_Voyager, {
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
          console.log(outputs);
          let i = 0;
          //find the first altair image output of this cell,
          //(if multiple output images in one cell, currently there's no method to locate, so only select the first one by default)
          while(i<outputs.length){
            if(!!outputs.get(i).data['application/vnd.dataresource+json']){
              var JSONobject = (outputs.get(i).data['application/vnd.dataresource+json'] as any).data;
              console.log(JSONobject)
              wdg = new VoyagerPanel_DF({data:{'values':JSONobject},fileName:filename});
              wdg.id = filename;
              wdg.title.closable = true;
              wdg.title.iconClass = 'jp-JSONIcon';
              app.shell.addToMainArea(wdg);
              app.shell.activateById(wdg.id);
              break;
            }
            i++;
          }
        }
      }

    }
  });

  //add context menu for altair image ouput
  app.contextMenu.addItem({
    command: CommandIDs.JL_Graph_Voyager,
    selector: '.p-Widget.jp-RenderedVegaCommon.jp-RenderedVegaLite.vega-embed.jp-OutputArea-output'
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Table_Voyager,
    //selector: '.p-Widget.jp-RenderedHTMLCommon.jp-RenderedHTML.jp-mod-trusted.jp-OutputArea-output'
    selector: '.dataframe'
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_TESTOPEN,
    //selector: '.p-Widget.jp-RenderedHTMLCommon.jp-RenderedHTML.jp-mod-trusted.jp-OutputArea-output'
    selector: '.dataframe'
  });


  //add tsv file type to docRegistry to support "Open With ..." context menu;
  app.docRegistry.addFileType({
    name: 'tsv',
    extensions: ['.tsv']
  });

  fileTypes.map(ft => {
    const factoryName = `Voyager (${ft})`;
    
    const tracker1 = new InstanceTracker<VoyagerPanel>({ namespace: `voyager-${ft}` });
    
    // Handle state restoration.
    
    restorer.restore(tracker1, {
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
    
    if(ftObj==undefined){
      console.log("app docreg getfile type: undefined");
    }
    else{
      console.log("app docreg getfile type: "+ftObj.name);
    }
    
    factory.widgetCreated.connect((sender, widget) => {
      // Track the widget.
      tracker1.add(widget);

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
  requires: [ILayoutRestorer, INotebookTracker,ICommandPalette],
  activate: activate
};
export default plugin;

