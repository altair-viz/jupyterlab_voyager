///<reference path="./lib.d.ts"/>

import {
  PathExt,nbformat
} from '@jupyterlab/coreutils';
import {
  ILayoutRestorer,
  JupyterLabPlugin,
  JupyterLab
} from '@jupyterlab/application';

import {
  ICommandPalette,InstanceTracker,Dialog, showDialog, showErrorMessage
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
  Widget
} from '@phosphor/widgets';

import {
  IMainMenu
} from '@jupyterlab/mainmenu';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';

import 'datavoyager/build/style.css';

import {
  INotebookTracker, NotebookPanel, NotebookTracker, NotebookModel,NotebookActions
} from '@jupyterlab/notebook';
import {
  CodeCell
} from '@jupyterlab/cells';

import {
  ReadonlyJSONObject,JSONExt
} from '@phosphor/coreutils';

import {VoyagerTutorialWidget} from './tutorial'
import {VoyagerPanel,VoyagerPanel_DF,isValidFileName} from './voyagerpanel'
import '../style/index.css';
//import { CommandRegistry } from '@phosphor/commands';
//import { Contents } from '@jupyterlab/services';

const VOYAGER_ICON = 'jp-VoyagerIcon';
/**
 * The class name added to a datavoyager widget.
 */
const Voyager_CLASS = 'jp-Voyager';

const SOURCE = require('../tutorial/tutorial.md');
var temp_widget_counter = 0;

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
  const JL_Voyager_Export = 'voyager_graph:Export';
  export
  const JL_Voyager_Export_To_Notebook = 'voyager_graph:Export_to_notebook';
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


class VoyagerWidgetFactory extends ABCWidgetFactory<VoyagerPanel, DocumentRegistry.IModel> {
  // pass fileType into constructor so we know what it is and can pass it to vega-loader
  // to get the data
  docManager: IDocumentManager;
  app:JupyterLab;
  constructor(app: JupyterLab, docManager: IDocumentManager, options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
    this.docManager = docManager;
    this.app = app;
  }
  protected createNewWidget(context: DocumentRegistry.Context): VoyagerPanel {
    let ft = PathExt.extname(context.localPath).substring(1)
    return new VoyagerPanel({context, fileType: ft},this.app,this.docManager);
  }


}

class VoyagerNotebookWidgetFactory extends ABCWidgetFactory<NotebookPanel, DocumentRegistry.IModel> {
  // pass fileType into constructor so we know what it is and can pass it to vega-loader
  // to get the data
  app: JupyterLab;
  KernalName?: string;
  constructor(app: JupyterLab, options: DocumentRegistry.IWidgetFactoryOptions, kernelName?:string) {
    super(options);
    this.app = app;
    this.KernalName = kernelName;
  }
  protected createNewWidget(context: DocumentRegistry.Context):any{
    let ll = this.app.shell.widgets('left');
    let fb = ll.next();
    while((fb as any).id!='filebrowser'){
      fb = ll.next();
    }
    let PATH = (fb as any).model.path as string;
    return this.app.commands.execute('docmanager:new-untitled', {
      path:  PATH, type: 'notebook'
    }).then(model => {
      return this.app.commands.execute('docmanager:open', {
        path: model.path, factory: 'Notebook', kernel:{name: this.KernalName?this.KernalName:'Python 3'}
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
            `with open('${PathExt.basename(context.path)}') as json_data:\n`,
            "    data_src = json.load(json_data)\n",
            "data = data_src['data']\n",
            "alt.Chart.from_dict(data_src)\n",
          ]
         }];
        model.fromJSON(md);
        (widget as NotebookPanel).notebook.model = model;
        widget.context.save();
        NotebookActions.runAll(widget.notebook, widget.context.session);
      });
    });
  }

}



const fileTypes = ['csv', 'json', 'tsv', 'txt'];
const fileTypes_vega = ['vega-lite2','vega3'];
function activate(app: JupyterLab, restorer: ILayoutRestorer, tracker_Notebook: NotebookTracker,palette: ICommandPalette, docManager: IDocumentManager, browserFactory: IFileBrowserFactory|null,mainMenu: IMainMenu,rendermime: IRenderMimeRegistry)/*: InstanceTracker<VoyagerPanel>*/{

  //let wdg:VoyagerPanel_DF;
  // Declare a widget variable
  let T_widget: VoyagerTutorialWidget;
  const { commands} = app;

  // Get the current cellar widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyJSONObject): NotebookPanel | null {
    const widget = tracker_Notebook.currentWidget;
    const activate = args['activate'] !== false;     
    if (activate && widget) {
      app.shell.activateById(widget.id);
    }
    return widget;
  }


  function createNew(cwd: string, data: any, open:boolean) {
    let input_block = document.createElement("div");
    let input_prompt = document.createElement("div");
    input_prompt.textContent = '';
    let input = document.createElement("input");
    input_block.appendChild(input_prompt);
    input_block.appendChild(input);
    let bd = new Widget({node:input_block});
    showDialog({
      title: "Export as Vega-Lite File (.vl.json)",
      body: bd,
      buttons: [Dialog.cancelButton(), Dialog.okButton({ label: "OK"})]
    }).then(result=>{
      let msg = input.value;
      if(result.button.accept){
        if(!isValidFileName(msg)){
          showErrorMessage('Name Error', Error(
            `"${result.value}" is not a valid name for a file. ` +
            `Names must have nonzero length, ` +
            `and cannot include "/", "\\", or ":"`
        ));
        }
        else{
          let basePath = cwd;
          let newPath = PathExt.join(basePath, msg.indexOf('.vl.json')!==-1?msg:msg+'.vl.json');
          return commands.execute('docmanager:new-untitled', {
            path: cwd, ext: '.vl.json', type: 'file'
          }).then(model => {
            return docManager.rename(model.path, newPath).then(model=>{
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
                          factory: `Voyager`
                        });
                      }
                    })     
                  }
                })
              }})
            })
          });
        }}
    })
  };



  commands.addCommand(CommandIDs.JL_Graph_Voyager, {
    label: 'Open Graph in Voyager',
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
              let context = docManager.contextForWidget(cur) as Context<DocumentRegistry.IModel>;
              var wdg = new VoyagerPanel_DF(JSONobject, filename, context, false, app, docManager);		
              wdg.data_src = JSONobject;
              wdg.id = filename+(temp_widget_counter++);		
              wdg.title.closable = true;		
              wdg.title.iconClass = VOYAGER_ICON;		
              const tracker = new InstanceTracker<VoyagerPanel_DF>({ namespace: 'VoyagerPanel_DataFrame' });  
              tracker.add(wdg);
              app.shell.addToMainArea(wdg);
              app.shell.activateById(wdg.id)
              console.log('widget id is: '+ wdg.id)
              break;
            }
            i++;
          }
        }
      }
    }
  });


  commands.addCommand(CommandIDs.JL_Table_Voyager, {
    label: 'Open table in Voyager',
    caption: 'Open the datasource in Voyager',
    execute: args => {
      console.log('open table in voyager')
      const cur = getCurrent(args);
      console.log(cur)
      if(cur){
        var filename = cur.id+'_Voyager';
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
              let context = docManager.contextForWidget(cur) as Context<DocumentRegistry.IModel>;
              var wdg = new VoyagerPanel_DF({'values':JSONobject}, filename,context, true, app,docManager);	
              wdg.data_src = {'values':JSONobject};
              wdg.id = filename+(temp_widget_counter++);	
              wdg.title.closable = true;		
              wdg.title.iconClass = VOYAGER_ICON;
              const tracker = new InstanceTracker<VoyagerPanel_DF>({ namespace: 'VoyagerPanel_DataFrame' });  
              tracker.add(wdg);
              app.shell.addToMainArea(wdg);
              app.shell.activateById(wdg.id);
              console.log('widget id is: '+ wdg.id)
              break;
            }
            else if(!!outputs.get(i).data['text/plain']){
              var JSONobject = outputs.get(i).data['text/plain'] as any;
              console.log(JSONobject)
              let context = docManager.contextForWidget(cur) as Context<DocumentRegistry.IModel>;
              var wdg = new VoyagerPanel_DF({'values':JSONobject}, filename,context,true, app,docManager);
              wdg.data_src = {'values':JSONobject};	
              wdg.id = filename+(temp_widget_counter++);		
              wdg.title.closable = true;	
              wdg.title.iconClass = VOYAGER_ICON;	
              const tracker = new InstanceTracker<VoyagerPanel_DF>({ namespace: 'VoyagerPanel_DataFrame' });  
              tracker.add(wdg);
              app.shell.addToMainArea(wdg);
              app.shell.activateById(wdg.id);
              console.log('widget id is: '+ wdg.id)
              break;
            }
            i++;
          }
        }
      }

    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Save, {
    label: '     ',
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
      return false;
    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Save1, {
    label: 'Save Voyager Chart',
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

  commands.addCommand(CommandIDs.JL_Voyager_Export, {
    label: 'Export Voyager as Vega-Lite File',
    caption: 'Export the chart datasource as vl.json file',
    execute: args => {
      let widget = app.shell.currentWidget;
      if(widget){
        console.log(widget.id)
        console.log(widget.hasClass(Voyager_CLASS))

          var datavoyager = (widget as VoyagerPanel|VoyagerPanel_DF).voyager_cur;
          var dataSrc = (widget as VoyagerPanel|VoyagerPanel_DF).data_src;
          //let aps = datavoyager.getApplicationState();
          let spec = datavoyager.getSpec(false);
          console.log(spec)
          let ll = app.shell.widgets('left');
          let fb = ll.next();
          while((fb as any).id!='filebrowser'){
            fb = ll.next();
          }
          let path = (fb as any).model.path as string;
          if(spec!==undefined){
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
          else{
            createNew(path, {
              "data":dataSrc, 
              }, false);  
          }
      }
    },
    isEnabled: () =>{      
      let widget = app.shell.currentWidget;
      if(widget&&widget.hasClass(Voyager_CLASS)&&(widget as VoyagerPanel|VoyagerPanel_DF).context.path.indexOf('vl.json')===-1){
          return true;
      }
      else{
        return false;
      }
    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Export_To_Notebook, {
    label: 'Export Voyager to Notebook',
    caption: 'Export the chart datasource to a new Notebook',
    execute: args => {
      let widget = app.shell.currentWidget;
      if(widget){
        console.log(widget.id)
        console.log(widget.hasClass(Voyager_CLASS))

          var datavoyager = (widget as VoyagerPanel|VoyagerPanel_DF).voyager_cur;
          var dataSrc = (widget as VoyagerPanel|VoyagerPanel_DF).data_src;
          let spec = datavoyager.getSpec(false);
          console.log(spec);
          let src =JSON.stringify({
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
          let ll = app.shell.widgets('left');
          let fb = ll.next();
          while((fb as any).id!='filebrowser'){
            fb = ll.next();
          }
          let path = (fb as any).model.path as string;
          return commands.execute('docmanager:new-untitled', {
            path: path, type: 'notebook', kernelPreference:{autoStartDefault:true}
          }).then(model => {
            return commands.execute('docmanager:open', {
              path: model.path, factory: 'Notebook', kernel:{name: 'Python 3'}
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
                  `data_src = json.loads('''${src}''')\n`,
                  "alt.Chart.from_dict(data_src)\n",
                ]
               }];
              model.fromJSON(md);
              (widget as NotebookPanel).notebook.model = model;
              widget.context.save().then(()=>{
                NotebookActions.runAll(widget.notebook, widget.context.session);
              });
              
            });
          });         
      }
    },
    isEnabled: () =>{      
      let widget = app.shell.currentWidget;
      if(widget&&widget.hasClass(Voyager_CLASS)&&((widget as VoyagerPanel|VoyagerPanel_DF).voyager_cur.getSpec(false)!==undefined)){
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
            `with open('''${name}''') as json_data:\n`,
            "    data_src = json.load(json_data)\n",
            "alt.Chart.from_dict(data_src)\n",
          ]
         }];
        model.fromJSON(md);
        (widget as NotebookPanel).notebook.model = model;
        widget.context.save().then(()=>{
          NotebookActions.runAndAdvance(widget.notebook, widget.context.session);
        });
        
      });
    });
  };
  //open a vl.json file in a notebook cell
  commands.addCommand(CommandIDs.JL_Voyager_Open_In_Notebook, {
    label: 'Open vl.json in Notebook',
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
      label: 'Show/Hide Toolbar',
      caption: 'show or hide toolbar in voyager',
      execute: args => {
        let widget = app.shell.currentWidget;
        if(widget){
          if((widget as VoyagerPanel|VoyagerPanel_DF).toolbar.isHidden){
            (widget as VoyagerPanel|VoyagerPanel_DF).toolbar.show();
          }
          else{
            (widget as VoyagerPanel|VoyagerPanel_DF).toolbar.hide();
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
    label: 'Voyager FAQ',
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
        (widget as VoyagerPanel|VoyagerPanel_DF).voyager_cur.undo();
      }
    },
  });

  commands.addCommand(CommandIDs.JL_Voyager_Redo, {
    label: 'Redo',
    caption: 'Update state to reflect the future state',
    execute: args => {
      let widget = app.shell.currentWidget;
      if(widget){
        (widget as VoyagerPanel|VoyagerPanel_DF).voyager_cur.redo();
      }
      const { currentWidget } = app.shell;
      if(currentWidget){
        console.log('currentwidget: '+true);
        if(docManager.contextForWidget(currentWidget)){
          console.log('contextforwidget: '+true)
        }
        else{
          console.log('contextforwidget: '+false)
        }
      }
      else{
        console.log('currentwidget: '+false)
      }

      console.log('File menu save option enable: '+!!(currentWidget && docManager.contextForWidget(currentWidget)));
    },
  });
/*
  let menu = new Menu({commands});
  menu.title.label = "Voyager";
  [
    CommandIDs.JL_Voyager_Open_In_Notebook,
  ].forEach(command =>{
    menu.addItem({command});
  });
  mainMenu.addMenu(menu,{rank:60});*/

  mainMenu.helpMenu.addGroup([{command:CommandIDs.JL_Voyager_Tutorial}], 0)

  mainMenu.fileMenu.addGroup([{command:CommandIDs.JL_Voyager_Save},{command:CommandIDs.JL_Voyager_Export}], 10)

  //add phosphor context menu for voyager, for the "save", "save as", "undo", "redo" functions
  /*
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
    command: CommandIDs.JL_Voyager_HideBar,
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank:3
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Save,
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank:4
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Export,
    selector: '.p-Widget.jp-Voyager.jp-Document.jp-Activity.p-DockPanel-widget',
    rank:5
  });*/
    //add phosphor context menu for voyager_dataframe, for the "save", "save as", "undo", "redo" functions
    app.contextMenu.addItem({
      command: CommandIDs.JL_Voyager_Undo,
      selector: '.voyager',
      rank:0
    });
    app.contextMenu.addItem({
      command: CommandIDs.JL_Voyager_Redo,
      selector: '.voyager',
      rank: 1
    });
    app.contextMenu.addItem({
      type: 'separator',
      selector: '.voyager',
      rank: 2
    });
    app.contextMenu.addItem({
      command: CommandIDs.JL_Voyager_HideBar,
      selector: '.voyager',
      rank:3
    });
    app.contextMenu.addItem({
      type: 'separator',
      selector: '.voyager',
      rank: 4
    });
    app.contextMenu.addItem({
      command: CommandIDs.JL_Voyager_Save1,
      selector: '.voyager',
      rank:5
    });
    app.contextMenu.addItem({
      command: CommandIDs.JL_Voyager_Export,
      selector: '.voyager',
      rank:6
    });
    app.contextMenu.addItem({
      command: CommandIDs.JL_Voyager_Export_To_Notebook,
      selector: '.voyager',
      rank:7
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

    const factoryName1 = `Voyager`;
    const tracker1 = new InstanceTracker<VoyagerPanel>({ namespace: factoryName1});  
    const factory1 = new VoyagerWidgetFactory(
      app,
      docManager,
      {
        name: factoryName1,
        fileTypes: ['csv', 'json', 'tsv', 'txt','vega-lite2','vega3'],
        readOnly: true
      }
    );
    // Handle state restoration.
    restorer.restore(tracker1, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: factoryName1 }),
      name: widget => widget.context.path
    });

    app.docRegistry.addWidgetFactory(factory1);

    factory1.widgetCreated.connect((sender, widget) => {
      // Track the widget.
      widget.id = widget.id;
      widget.title.icon = VOYAGER_ICON;
      widget.context.pathChanged.connect(()=>{tracker1.save(widget);});
      tracker1.add(widget);
    });

    fileTypes.map(ft => {
      let ftObj = app.docRegistry.getFileType(ft);
      if(ftObj==undefined){
        console.log("app docreg getfile type: undefined");
      }
      else{
        console.log("app docreg getfile type: "+ftObj.name);
      }
    })
  
    const factoryName2 = `Vegalite in New Notebook`;
    const tracker2 = new InstanceTracker<NotebookPanel>({ namespace: factoryName2 });  
    const factory2 = new VoyagerNotebookWidgetFactory(
      app,
      {
        name: factoryName2,
        fileTypes: ['vega-lite2','vega3'],
        readOnly: true
      }
    );
    // Handle state restoration.
    
    restorer.restore(tracker2, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: factoryName2 }),
      name: widget => widget.context.path
    });

    app.docRegistry.addWidgetFactory(factory2);
    factory2.widgetCreated.connect((sender, widget) => {
      // Track the widget.
      tracker2.add(widget);
      widget.context.pathChanged.connect(()=>{tracker2.save(widget);});
      widget.title.iconClass = VOYAGER_ICON;
    });

    fileTypes_vega.map(ft => {
    let ftObj = app.docRegistry.getFileType(ft);
    
    if(ftObj==undefined){
      console.log("app docreg getfile type: undefined");
    }
    else{
      console.log("app docreg getfile type: "+ftObj.name);
    }
   })
   
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

