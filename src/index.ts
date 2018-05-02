///<reference path="./lib.d.ts"/>

import {
  ActivityMonitor, PathExt,nbformat
} from '@jupyterlab/coreutils';
import {
  ILayoutRestorer,
  JupyterLabPlugin,
  JupyterLab
} from '@jupyterlab/application';

import {
  ICommandPalette,InstanceTracker,Toolbar,ToolbarButton, Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  Context
} from '@jupyterlab/docregistry';

import {
  IFileBrowserFactory, FileBrowser
} from '@jupyterlab/filebrowser';

import {
  Widget, Menu,BoxLayout
} from '@phosphor/widgets';

import {
  Message
} from '@phosphor/messaging';

import {
  IMainMenu
} from '@jupyterlab/mainmenu';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';

import { CreateVoyager, Voyager } from 'datavoyager/build/lib-voyager';
import { VoyagerConfig } from 'datavoyager/build/models/config';
import 'datavoyager/build/style.css';
import { read } from 'vega-loader';

import {
  INotebookTracker, NotebookPanel, NotebookTracker, NotebookModel,NotebookActions
} from '@jupyterlab/notebook';
import {
  CodeCell
} from '@jupyterlab/cells';

import {
  ReadonlyJSONObject,PromiseDelegate,JSONExt
} from '@phosphor/coreutils';

import {VoyagerTutorialWidget} from './tutorial'

import '../style/index.css';

const VOYAGER_ICON = 'jp-VoyagerIcon';
const VOYAGER_PANEL_TOOLBAR_CLASS = 'jp-VoyagerPanel-toolbar';
/**
 * The class name added to toolbar save button.
 */
const TOOLBAR_SAVE_CLASS = 'jp-SaveIcon';

/**
 * The class name added to toolbar insert button.
 */
const TOOLBAR_SAVE_AS_CLASS = 'jp-SaveAsIcon';

/**
 * The class name added to toolbar cut button.
 */
const TOOLBAR_UNDO_CLASS = 'jp-UndoIcon';

/**
 * The class name added to toolbar copy button.
 */
const TOOLBAR_REDO_CLASS = 'jp-RedoIcon';

/**
 * The class name added to a datavoyager widget.
 */
const Voyager_CLASS = 'jp-Voyager';

const SOURCE = require('../tutorial/tutorial.md');

//import { ReactChild } from 'react';
export namespace CommandIDs {
  export
  const JL_Graph_Voyager = 'graph_voyager:open';
  export
  const JL_Table_Voyager = 'table_voyager:open';
  export
  const JL_Voyager_Save = 'voyager_graph:save';
  export
  const JL_Voyager_Save1 = 'voyager_graph:save1';
  export
  const JL_Voyager_Open = 'voyager_file:open';
  export
  const JL_Voyager_Open_In_Notebook = 'voyager_VL_JSON_file:open_in_notebook';
  export
  const JL_Voyager_Tutorial = 'voyager_tutorial:open';
  export
  const JL_Voyager_Undo = 'voyager_graph:undo';
  export
  const JL_Voyager_Redo = 'voyager_graph:redo';
  export
  const JL_Voyager_HideBar = 'voyager_graph:hidebar';
}

export
function createSaveButton(widget: VoyagerPanel): ToolbarButton {
  return new ToolbarButton({
    className: TOOLBAR_SAVE_CLASS,
    onClick: () => {
      if(widget&&widget.hasClass(Voyager_CLASS)&&(widget as VoyagerPanel).context.path.indexOf('vl.json')!==-1){
        var datavoyager = (widget as VoyagerPanel).voyager_cur;
        var dataSrc = (widget as VoyagerPanel).data_src;
        let spec = datavoyager.getSpec(false);
        let context = widget.context as Context<DocumentRegistry.IModel>;
        context.model.fromJSON({
          "data":dataSrc, 
          "mark": spec.mark, 
          "encoding": spec.encoding, 
          "height":spec.height, 
          "width":spec.width, 
          "description":spec.description,
          "name":spec.name,
          "selection":spec.selection,
          "title":spec.title,
          "transform":spec.transform
        });
        context.save();
      }
      else{
        showDialog({
          title: "Warning",
          body: "File must end in vl.json to save, use 'Save As' instead",
          buttons: [Dialog.warnButton({ label: "OK"})]
        })
      }
    },
    tooltip: 'Save the current voyager contents',    
  });
}

export
function createSaveAsButton(widget: VoyagerPanel): ToolbarButton {
  return new ToolbarButton({
    className: TOOLBAR_SAVE_AS_CLASS,
    onClick: () => {
      var datavoyager = (widget as VoyagerPanel).voyager_cur;
      var dataSrc = (widget as VoyagerPanel).data_src;
      //let aps = datavoyager.getApplicationState();
      let spec = datavoyager.getSpec(false);
      //let context = docManager.contextForWidget(widget) as Context<DocumentRegistry.IModel>;
      let context = widget.context as Context<DocumentRegistry.IModel>;
      context.model.fromJSON({
        "data":dataSrc, 
        "mark": spec.mark, 
        "encoding": spec.encoding, 
        "height":spec.height, 
        "width":spec.width, 
        "description":spec.description,
        "name":spec.name,
        "selection":spec.selection,
        "title":spec.title,
        "transform":spec.transform
      });
      //context.model.fromJSON(spec);
      context.saveAs();
    },
    tooltip: 'Save the current voyager contents to a vl.json file'
  });
}

export
function createUndoButton(widget: VoyagerPanel): ToolbarButton {
  return new ToolbarButton({
    className: TOOLBAR_UNDO_CLASS,
    onClick: () => {
      (widget as VoyagerPanel).voyager_cur.undo();
    },
    tooltip: 'Update state to reflect the previous state'
  });
}

export
function createRedoButton(widget: VoyagerPanel): ToolbarButton {
  return new ToolbarButton({
    className: TOOLBAR_REDO_CLASS,
    onClick: () => {
      (widget as VoyagerPanel).voyager_cur.redo();
    },
    tooltip: 'Update state to reflect the future state'
  });
}





/**
 * A namespace for `VoyagerPanel` statics.
 */
export
namespace VoyagerPanel {
  /**
   * Instantiation options for Voyager widgets.
   */
  export
  interface IOptions {
    /**
     * The document context for the Voyager being rendered by the widget.
     */
    context: DocumentRegistry.Context;
    fileType: string;
  }
}
export
class VoyagerPanel extends Widget implements DocumentRegistry.IReadyWidget {
  static config: VoyagerConfig = {
    // don't allow user to select another data source from Voyager UI
    showDataSourceSelector: false,
    //manualSpecificationOnly: true,
    hideHeader: true,
    hideFooter: true,

  }
  public voyager_cur: Voyager;
  public voyager_widget: Widget;
  public data_src:any;
  public fileType: String;
  public toolbar:Toolbar<Widget>;
  // it would make sense to resolve this promise after we have parsed the data
  // and created the Voyager component, but this will trigger an attempted
  // cleanup of the spinner element, which will already have been deleted
  // by the Voyager constructor and so will raise an exception.
  // So instead we just never resolve this promise, which still gives us the
  // spinner until Voyager overwrites the element.

  constructor(options: VoyagerPanel.IOptions) {
    super();
    this.addClass(Voyager_CLASS);
    const context = this._context = options.context;
    this.fileType = options.fileType;

    this.title.label = PathExt.basename(context.path);
    context.pathChanged.connect(this._onPathChanged, this);
    this._onPathChanged();

    let layout = this.layout = new BoxLayout();

    this.voyager_widget = new Widget();

    this._context.ready.then(_ => {
      this._ready.resolve(undefined);
      const data = context.model.toString();
      var values;
      if(this.fileType==='txt'){
        values = read(data, { type: 'json' });
      }
      else{
        values = read(data, { type: this.fileType });
      }
      if(this.fileType==='json'||this.fileType==='txt'){
        if(values['data']){
          var DATA = values['data'];
          this.data_src = DATA;
          console.log(values['data']);
          if(DATA['url']){ //check if it's url type datasource
            this.voyager_cur = CreateVoyager(this.voyager_widget.node, VoyagerPanel.config, values['data']);
          }
          else if(DATA['values']){ //check if it's array value data source
           this.voyager_cur = CreateVoyager(this.voyager_widget.node, VoyagerPanel.config, values['data']);
          }
          else{//other conditions, just try to pass the value to voyager and wish the best
            this.voyager_cur = CreateVoyager(this.voyager_widget.node, VoyagerPanel.config, values['data']);
            this.data_src = values['data'];
          }
        }
        else{ //other conditions, just try to pass the value to voyager and wish the best
          this.voyager_cur = CreateVoyager(this.voyager_widget.node, VoyagerPanel.config, { values });
          this.data_src = {values};
        }
        console.log('mark": '+values['mark']);
        console.log('encoding '+values['encoding']);
        console.log('config '+values['config']);

        //update the specs if possible
        this.voyager_cur.setSpec({
            "mark": values['mark'], 
            "encoding": values['encoding'], 
            "height":values['height'], 
            "width":values['width'], 
            "description":values['description'],
            "name":values['name'],
            "selection":values['selection'],
            "title":values['title'],
            "transform":values['transform']
        });

      }
      else{
        this.voyager_cur = CreateVoyager(this.voyager_widget.node, VoyagerPanel.config, { values });
        this.data_src = {values};
      }
    })

    // Toolbar
    this.toolbar = new Toolbar();
    this.toolbar.addClass(VOYAGER_PANEL_TOOLBAR_CLASS);
    this.toolbar.addItem('save', createSaveButton(this));
    this.toolbar.addItem('saveAs', createSaveAsButton(this));
    this.toolbar.addItem('undo', createUndoButton(this));
    this.toolbar.addItem('redo', createRedoButton(this));

    layout.addWidget(this.toolbar);
    layout.addWidget(this.voyager_widget);

    BoxLayout.setStretch(this.toolbar, 0);
    BoxLayout.setStretch(this.voyager_widget, 1);

    this.toolbar.hide();
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
    if(this._context.path.indexOf('vl.json')!==-1){
    var datavoyager = this.voyager_cur;
    var dataSrc = this.data_src;
    //let aps = datavoyager.getApplicationState();
    let spec = datavoyager.getSpec(false);
    this._context.model.fromJSON({
      "data":dataSrc, 
      "mark": spec.mark, 
      "encoding": spec.encoding, 
      "height":spec.height, 
      "width":spec.width, 
      "description":spec.description,
      "name":spec.name,
      "selection":spec.selection,
      "title":spec.title,
      "transform":spec.transform
    });
    }
    //context.model.fromJSON(spec);
    //this._context.save();
    return this._context;
  }

  /**
   * A promise that resolves when the file editor is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  private _onPathChanged(): void {
    this.title.label = PathExt.basename(this._context.localPath);
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this._monitor) {
      this._monitor.dispose();
    }
    super.dispose();
  }

    /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.voyager_widget.node.tabIndex = -1;
    this.voyager_widget.node.focus();
  }

  protected _context: DocumentRegistry.Context;
  private _ready = new PromiseDelegate<void>();
  private _monitor: ActivityMonitor<any, any> | null = null;
  
}

class VoyagerWidgetFactory extends ABCWidgetFactory<VoyagerPanel, DocumentRegistry.IModel> {
  // pass fileType into constructor so we know what it is and can pass it to vega-loader
  // to get the data
  constructor(private fileType: string, options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
  }
  protected createNewWidget(context: DocumentRegistry.Context): VoyagerPanel {
    return new VoyagerPanel({context, fileType: this.fileType});
  }

}


const fileTypes = ['csv', 'json', 'tsv', 'txt','vl.json'];
function activate(app: JupyterLab, restorer: ILayoutRestorer, tracker: NotebookTracker,palette: ICommandPalette, docManager: IDocumentManager, browserFactory: IFileBrowserFactory|null,mainMenu: IMainMenu,rendermime: IRenderMimeRegistry)/*: InstanceTracker<VoyagerPanel>*/{

  //let wdg:VoyagerPanel_DF;
  // Declare a widget variable
  let T_widget: VoyagerTutorialWidget;
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


  function createNew(cwd: string, data: any, open:boolean) {
    return commands.execute('docmanager:new-untitled', {
      path: cwd, ext: '.vl.json', type: 'file'
    }).then(model => {
      return commands.execute('docmanager:open', {
        path: model.path, factory: "Editor"
      }).then(widget=>{
        let context = docManager.contextForWidget(widget);
        if(context!=undefined){
          context.save().then(()=>{
            if(context!=undefined){
              context.model.fromJSON(data);
              context.save().then(()=>{
                if (open) {
                  commands.execute('docmanager:open', {
                    path: model.path,
                    factory: `Voyager (json)`
                  });
                }
              })     
            }
          })
        }})
    });
  };



  commands.addCommand(CommandIDs.JL_Graph_Voyager, {
    label: 'Open in Voyager',
    caption: 'Open the datasource in Voyager',
    execute: args => {
      const cur = getCurrent(args);
      if(cur){
        //var filename = cur.id+'_Voyager';
        let cell = cur.notebook.activeCell;
        if(cell.model.type==='code'){
          let codeCell = (cur.notebook.activeCell as CodeCell);
          let outputs = codeCell.model.outputs;
          console.log(outputs);
          let i = 0;
          //find the first altair image output of this cell,
          //(if multiple output images in one cell, currently there's no method to locate, so only select the first one by default)application/vnd.jupyter.stdout stdout doesn't have 'data' field
          while(i<outputs.length){ 
            if(!!outputs.get(i).data['application/vnd.vegalite.v2+json']){
              if(!!(outputs.get(i).data['application/vnd.vegalite.v2+json'] as any).vconcat){
                var JSONobject = (outputs.get(i).data['application/vnd.vegalite.v2+json'] as any).vconcat['0'];
              }
              else{
                var JSONobject = (outputs.get(i).data['application/vnd.vegalite.v2+json'] as any);
              }
              console.log('type is application/vnd.vegalite.v2+json')
              console.log(JSONobject)
              let ll = app.shell.widgets('left');
              let fb = ll.next();
              while((fb as any).id!='filebrowser'){
                fb = ll.next();
              }
              let path = (fb as any).model.path as string;
              createNew(path, JSONobject, true);
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
      console.log('open table in voyager')
      const cur = getCurrent(args);
      console.log(cur)
      if(cur){
        let cell = cur.notebook.activeCell;
        console.log(cell.model.type)
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
              let ll = app.shell.widgets('left');
              let fb = ll.next();
              while((fb as any).id!='filebrowser'){
                fb = ll.next();
              }
              let path = (fb as any).model.path as string;
              createNew(path, {'data':{'values':JSONobject}}, true);
              break;
            }
            i++;
          }
        }
      }

    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Save, {
    label: 'Save Voyager',
    caption: 'Save the chart datasource as vl.json file',
    execute: args => {
      let widget = app.shell.currentWidget;
      if(widget){
        var datavoyager = (widget as VoyagerPanel).voyager_cur;
        var dataSrc = (widget as VoyagerPanel).data_src;
        //let aps = datavoyager.getApplicationState();
        let spec = datavoyager.getSpec(false);
        let context = docManager.contextForWidget(widget) as Context<DocumentRegistry.IModel>;
        context.model.fromJSON({
          "data":dataSrc, 
          "mark": spec.mark, 
          "encoding": spec.encoding, 
          "height":spec.height, 
          "width":spec.width, 
          "description":spec.description,
          "name":spec.name,
          "selection":spec.selection,
          "title":spec.title,
          "transform":spec.transform
        });
        //context.model.fromJSON(spec);
        context.save();
      }
    },
    isEnabled: () =>{      
      let widget = app.shell.currentWidget;
      if(widget&&widget.hasClass(Voyager_CLASS)&&(widget as VoyagerPanel).context.path.indexOf('vl.json')!==-1){
        return true;
      }
      else{
        return false;
      }
    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Save1, {
    label: 'Export Voyager AS vl.json',
    caption: 'Export the chart datasource as vl.json file',
    execute: args => {
      let widget = app.shell.currentWidget;
      
      if(widget){
          var datavoyager = (widget as VoyagerPanel).voyager_cur;
          var dataSrc = (widget as VoyagerPanel).data_src;
          //let aps = datavoyager.getApplicationState();
          let spec = datavoyager.getSpec(false);
          let ll = app.shell.widgets('left');
          let fb = ll.next();
          while((fb as any).id!='filebrowser'){
            fb = ll.next();
          }
          let path = (fb as any).model.path as string;
          createNew(path, {
            "data":dataSrc, 
            "mark": spec.mark, 
            "encoding": spec.encoding, 
            "height":spec.height, 
            "width":spec.width, 
            "description":spec.description,
            "name":spec.name,
            "selection":spec.selection,
            "title":spec.title,
            "transform":spec.transform
            }, false);   
      }
    },
    isEnabled: () =>{      
      let widget = app.shell.currentWidget;
      if(widget&&widget.hasClass(Voyager_CLASS)){
        return true;
      }
      else{
        return false;
      }
    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Open, {
    label: 'Open file in Voyager',
    caption: 'Open the selected file(s) in Voyager',
    execute: args => {
      let ll = app.shell.widgets('left');
      let fb = ll.next();
      while((fb as any).id!='filebrowser'){
        fb = ll.next();
      }
      let cur_fb = (fb as FileBrowser).selectedItems();
      let target_file = cur_fb.next();     
      if(target_file!==undefined&&target_file.type==='file'){
        let target_file_ext = PathExt.extname(target_file.path);
        console.log(target_file_ext)
        switch(target_file_ext){
          case '.json':
            commands.execute('docmanager:open', {path: target_file.path, factory: `Voyager (json)`});
            break; 
          case '.csv':
            commands.execute('docmanager:open', {path: target_file.path, factory: `Voyager (csv)`});
            break;
          case '.tsv':
            commands.execute('docmanager:open', {path: target_file.path, factory: `Voyager (tsv)`});
            break;
        }
        //target_file=cur_fb.next();
      }
      
    },

    isEnabled: () =>{      
      let ll = app.shell.widgets('left');
      let fb = ll.next();
      while((fb as any).id!='filebrowser'){
        fb = ll.next();
      }
      let cur_fb = (fb as FileBrowser).selectedItems();
      let target_file = cur_fb.next();     
      if(target_file!==undefined&&target_file.type==='file'){
        let target_file_ext = PathExt.extname(target_file.path);
        switch(target_file_ext){
          case '.json':
            return true; 
          case '.csv':
            return true;
          case '.tsv':
            return true;
          default:
            return false;
        }
      }
      else{
        return false;
      }
    }
    
  });

  function createNewNotebook(cwd: string, name:string, kernelName?:string) {
    return commands.execute('docmanager:new-untitled', {
      path: cwd, type: 'notebook'
    }).then(model => {
      return commands.execute('docmanager:open', {
        path: model.path, factory: 'Notebook', kernel:{name: kernelName?kernelName:'Python 3'}
      }).then(widget=>{
        let md = (widget as NotebookPanel).notebook.model.toJSON() as nbformat.INotebookContent;
        let model = new NotebookModel();
        md.cells = [{
          "cell_type": "code",
          "execution_count": null,
          "metadata": {},
          "outputs": [],
          "source": [
            "import altair as alt\n",
            "import pandas as pd\n",
            "import json\n",
            `with open('${name}') as json_data:\n`,
            "\tdata_src = json.load(json_data)\n",
            "data = data_src['data']\n",
            "try:\n",
            "\tDATA = pd.DataFrame.from_records(data['values'])\n",
            "except KeyError:\n",
            "\tDATA = str(data['url'])\n",
            "encoding = data_src['encoding']\n",
            "mark = data_src['mark']\n",
            "alt.Chart(data=DATA, encoding=encoding, mark=str(mark))\n",
          ]
         }];
        model.fromJSON(md);
        (widget as NotebookPanel).notebook.model = model;
        widget.context.save();
        NotebookActions.runAll(widget.notebook, widget.context.session);
      });
    });
  };
  //open a vl.json file in a notebook cell
  commands.addCommand(CommandIDs.JL_Voyager_Open_In_Notebook, {
    label: 'Open vl.json file in Notebook',
    caption: 'Open a vl.json file in Notebook cell',
    execute: args => {
      let ll = app.shell.widgets('left');
      let fb = ll.next();
      while((fb as any).id!='filebrowser'){
        fb = ll.next();
      }
      let cur_fb = (fb as FileBrowser).selectedItems();
      let target_file = cur_fb.next();     
      if(target_file!==undefined&&target_file.type==='file'&&target_file.path.indexOf('vl.json')!==-1){       
        let cwd = browserFactory ? browserFactory.defaultBrowser.model.path : '';
        return createNewNotebook(cwd, target_file.name);
      }
    },
    isEnabled: () =>{    
      let ll = app.shell.widgets('left');
      let fb = ll.next();
      while((fb as any).id!='filebrowser'){
        fb = ll.next();
      }
      let cur_fb = (fb as FileBrowser).selectedItems();
      let target_file = cur_fb.next();     
      if(target_file!==undefined&&target_file.type==='file'&&target_file.path.indexOf('vl.json')!==-1){
          return true;   
      }
      else{
        return false;
      }
    }
  });

    //open a vl.json file in a notebook cell
    commands.addCommand(CommandIDs.JL_Voyager_HideBar, {
      label: 'Show/Hide toolbar',
      caption: 'show or hide toolbar in voyager',
      execute: args => {
        let widget = app.shell.currentWidget;
        if(widget){
          if((widget as VoyagerPanel).toolbar.isHidden){
            (widget as VoyagerPanel).toolbar.show();
          }
          else{
            (widget as VoyagerPanel).toolbar.hide();
          }
        }
      },
      isEnabled: () =>{      
        let widget = app.shell.currentWidget;
        if(widget&&widget.hasClass(Voyager_CLASS)){
          return true;
        }
        else{
          return false;
        }
      }
    });



  // Track and restore the widget state
  let tracker0 = new InstanceTracker<VoyagerTutorialWidget>({ namespace: 'voyager_tutorial' });
    // Add an application command
  const command: string = CommandIDs.JL_Voyager_Tutorial;
  restorer.restore(tracker0, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => 'voyager_tutorial'
  });
  commands.addCommand(CommandIDs.JL_Voyager_Tutorial, {
    label: 'Open Tutorial',
    caption: 'Open tutorial page for JupyterLab_voyager',
    execute: args => {
      if (!T_widget) {
        // Create a new widget if one does not exist
        
        let content = rendermime.createRenderer('text/markdown');
        const model = rendermime.createModel({data:{'text/markdown': SOURCE}});
        content.renderModel(model);
        content.addClass('jp-VoyagerTutorial-content');
        T_widget = new VoyagerTutorialWidget(content);
        T_widget.update();
      }
      if (!tracker0.has(T_widget)) {
        // Track the state of the widget for later restoration
        tracker0.add(T_widget);
      }
      if (!T_widget.isAttached) {
        // Attach the widget to the main area if it's not there
        app.shell.addToMainArea(T_widget);
      } else {
        // Refresh the comic in the widget
        T_widget.update();
      }
      // Activate the widget
      app.shell.activateById(T_widget.id);
    },
  });

  commands.addCommand(CommandIDs.JL_Voyager_Undo, {
    label: 'Undo',
    caption: 'Update state to reflect the previous state',
    execute: args => {
      let widget = app.shell.currentWidget;
      if(widget){
        (widget as VoyagerPanel).voyager_cur.undo();
      }
    },
  });

  commands.addCommand(CommandIDs.JL_Voyager_Redo, {
    label: 'Redo',
    caption: 'Update state to reflect the future state',
    execute: args => {
      let widget = app.shell.currentWidget;
      if(widget){
        (widget as VoyagerPanel).voyager_cur.redo();
      }
    },
  });

  let menu = new Menu({commands});
  menu.title.label = "Voyager";
  [
    CommandIDs.JL_Voyager_Open,CommandIDs.JL_Voyager_Open_In_Notebook, CommandIDs.JL_Voyager_Tutorial, CommandIDs.JL_Voyager_HideBar,
  ].forEach(command =>{
    menu.addItem({command});
  });
  mainMenu.addMenu(menu,{rank:60});

  mainMenu.fileMenu.addGroup([{command:CommandIDs.JL_Voyager_Save},{command:CommandIDs.JL_Voyager_Save1}], 3)

  //add phosphor context menu for voyager, for the "save", "save as", "undo", "redo" functions
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Undo,
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank:0
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Redo,
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank: 1
  });
  app.contextMenu.addItem({
    type: 'separator',
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank: 2
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Save,
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank:3
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Save1,
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank:4
  });

  //add context menu for altair image ouput
  app.contextMenu.addItem({
    command: CommandIDs.JL_Graph_Voyager,
    selector: '.p-Widget.jp-RenderedVegaCommon3.jp-RenderedVegaLite2.jp-OutputArea-output.vega-embed'
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Graph_Voyager,
    selector: '.p-Widget.jp-RenderedVegaCommon.jp-RenderedVegaLite.vega-embed.jp-OutputArea-output'
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Graph_Voyager,
    selector: '.p-Widget.jp-RenderedImage.jp-OutputArea-output'
  });

  app.contextMenu.addItem({
    command: CommandIDs.JL_Table_Voyager,
    //selector: '.p-Widget.jp-RenderedHTMLCommon.jp-RenderedHTML.jp-mod-trusted.jp-OutputArea-output'
    selector: '.dataframe'
  });

  //add tsv file type to docRegistry to support "Open With ..." context menu;
  app.docRegistry.addFileType({
    name: 'tsv',
    extensions: ['.tsv']
  });
  //add txt file type to docRegistry to support "Open With ..." context menu;
  app.docRegistry.addFileType({
    name: 'txt',
    extensions: ['.txt']
  });

  fileTypes.map(ft => {
    const factoryName = `Voyager (${ft})`;
    const tracker1 = new InstanceTracker<VoyagerPanel>({ namespace: factoryName });  
    const factory = new VoyagerWidgetFactory(
      ft,
      {
        name: factoryName,
        fileTypes: [ft],
        readOnly: true
      }
    );
    

    // Handle state restoration.
    
    restorer.restore(tracker1, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: factoryName }),
      name: widget => widget.context.path
    });

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
      widget.context.pathChanged.connect(()=>{tracker1.save(widget);});
      widget.title.iconClass = VOYAGER_ICON;
      if (ftObj) {
        /*
        if (ftObj.iconClass)
          widget.title.iconClass = ftObj.iconClass;
          */
        if (ftObj.iconLabel)
          widget.title.iconLabel = ftObj.iconLabel;
      }
    });
    
  });
}

//const plugin: JupyterLabPlugin<InstanceTracker<VoyagerPanel>> = {
  const plugin: JupyterLabPlugin<void> = {
  // NPM package name : JS object name
  id: 'jupyterlab_voyager:plugin',
  autoStart: true,
  requires: [ILayoutRestorer, INotebookTracker,ICommandPalette,IDocumentManager, IFileBrowserFactory, IMainMenu, IRenderMimeRegistry],
  activate: activate
};
export default plugin;

