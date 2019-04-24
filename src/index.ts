///<reference path="./lib.d.ts"/>

import { PathExt, nbformat } from "@jupyterlab/coreutils";

import {
  ILayoutRestorer,
  JupyterLabPlugin,
  JupyterLab
} from '@jupyterlab/application';

import {
  //ICommandPalette,
  InstanceTracker,
  Clipboard,
  Dialog,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  Context,
  IDocumentWidget,
  DocumentWidget
} from "@jupyterlab/docregistry";

import { Widget } from "@phosphor/widgets";

import {
  IMainMenu
} from '@jupyterlab/mainmenu';

import { IDocumentManager } from "@jupyterlab/docmanager";

import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

import {
  INotebookTracker,
  NotebookPanel,
  NotebookTracker,
  NotebookActions
} from "@jupyterlab/notebook";

import { CodeCell } from "@jupyterlab/cells";

import { ReadonlyJSONObject, JSONExt } from "@phosphor/coreutils";

import { VoyagerTutorialWidget } from "./tutorial";

import { VoyagerPanel, VoyagerPanel_DF, isValidFileName } from "./voyagerpanel";

import "../style/index.css";

import "datavoyager/build/style.css";

/**
 * The mimetype used for Jupyter cell data.
 */
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

/**
 * The class icon for a datavoyager widget.
 */
const VOYAGER_ICON = "jp-VoyagerIcon";

/**
 * The class name added to a datavoyager widget.
 */
const Voyager_CLASS = 'jp-Voyager';

/**
 * The source file for the Voyager tutorial.
 */
const SOURCE = require("../tutorial/tutorial.md");

/**
 * A counter for VoyagerPanel_DF widgets, to give them distinct IDs.
 */
var temp_widget_counter = 0;

/**
 * Definitions for all the commands to be used.
 */
export namespace CommandIDs {
  export const JL_Graph_Voyager = "graph_voyager:open";
  export const JL_Table_Voyager = "table_voyager:open";
  export const JL_Voyager_Save = "voyager_graph:save";
  export const JL_Voyager_Save1 = "voyager_graph:save1";
  export const JL_Voyager_Export = "voyager_graph:Export";
  export const JL_Voyager_Export_To_Notebook =
    "voyager_graph:Export_to_notebook";
  export const JL_Voyager_Tutorial = "voyager_tutorial:open";
  export const JL_Voyager_Undo = "voyager_graph:undo";
  export const JL_Voyager_Redo = "voyager_graph:redo";
  export const JL_Voyager_HideBar = "voyager_graph:hidebar";
}

/**
 * The widget factory class to open a file with the VoyagerPanel.
 */
class VoyagerWidgetFactory extends ABCWidgetFactory<
  IDocumentWidget<VoyagerPanel>
> {
  docManager: IDocumentManager;
  app: JupyterLab;

  /**
   * Construct a new Voyager widget factory.
   */
  constructor(
    app: JupyterLab,
    docManager: IDocumentManager,
    options: DocumentRegistry.IWidgetFactoryOptions
  ) {
    super(options);
    this.docManager = docManager;
    this.app = app;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDocumentWidget<VoyagerPanel> {
    let context_array = context.path.split(".");
    const file_type = context_array[context_array.length-1];
    const content = new VoyagerPanel(
      { context, fileType: file_type },
      this.app,
      this.docManager
    );
    const widget = new DocumentWidget({ context, content });
    return widget;
  }
}

/**
 * The widget factory class to open a vl.json file with notebook.
 */
class VoyagerNotebookWidgetFactory extends ABCWidgetFactory<
  NotebookPanel,
  DocumentRegistry.IModel
> {
  app: JupyterLab;
  KernalName?: string;

  /**
   * Construct a new notebook widget factory.
   */
  constructor(
    app: JupyterLab,
    options: DocumentRegistry.IWidgetFactoryOptions,
    kernelName?: string
  ) {
    super(options);
    this.app = app;
    this.KernalName = kernelName;
  }

  /**
   * Create a new notebook widget with pre-written python codes.
   */
  protected createNewWidget(context: DocumentRegistry.Context): any {
    let PATH = PathExt.dirname(context.path);
    return this.app.commands
      .execute("docmanager:new-untitled", {
        path: PATH,
        type: "notebook"
      })
      .then(model => {
        return this.app.commands
          .execute("docmanager:open", {
            path: model.path,
            factory: "Notebook",
            kernel: { name: this.KernalName ? this.KernalName : "Python 3" }
          })
          .then(widget => {
            let md = (widget as NotebookPanel).model.toJSON() as nbformat.INotebookContent;
            md.cells = [
              {
                cell_type: "code",
                execution_count: null,
                metadata: {},
                outputs: [],
                source: [
                  "import altair as alt\n",
                  "import pandas as pd\n",
                  "import json\n",
                  `with open('${PathExt.basename(
                    context.path
                  )}') as json_data:\n`,
                  "    data_src = json.load(json_data)\n",
                  "data = data_src['data']\n",
                  "alt.Chart.from_dict(data_src)\n"
                ]
              }
            ];
            (widget as NotebookPanel).model.fromJSON(md);
            widget.context.save();
            NotebookActions.runAll(widget.notebook, widget.context.session);
          });
      });
    }
  }

/**
 * Define the supported file types.
 */
const fileTypes = ["csv", "json", "tsv"];
const fileTypes_vega = ["vega-lite2", "vega3"];

function activate(
  app: JupyterLab,
  restorer: ILayoutRestorer,
  tracker_Notebook: NotebookTracker,
  docManager: IDocumentManager,
  mainMenu: IMainMenu,
  rendermime: IRenderMimeRegistry
): void {
  // Declare a widget variable for tutorial
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

  /**
   * Create a new local file
   * @param cwd: current file path
   * @param data: the data to be written in the new file
   * @param open: whether to open this new file
   */
  function createNew(cwd: string, data: any, open: boolean) {
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
      if (result.button.accept) {
        if (!isValidFileName(msg)) {
          showErrorMessage(
            "Name Error",
            Error(
              `"${result.value}" is not a valid name for a file. ` +
                `Names must have nonzero length, ` +
                `and cannot include "/", "\\", or ":"`
            )
          );
        } else {
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

  /**
   * create and add the command to open a notebook graph in Voyager
   */
  commands.addCommand(CommandIDs.JL_Graph_Voyager, {
    label: 'Open Graph in Voyager',
    caption: 'Open the datasource in Voyager',
    execute: args => {
      const cur = getCurrent(args);
      if(cur){
        var filename = cur.id+'_Voyager';
        let cell = cur.content.activeCell;
        if (cell && cell.model.type === "code") {
          let codeCell = cur.content.activeCell as CodeCell;
          let outputs = codeCell.model.outputs;
          let i = 0;
          // Find the first altair image output of this cell,
          // If multiple output images in one cell, currently there's no method to locate the selected one,
          // so only select the first one by default)
          while (i < outputs.length) {
            if (!!outputs.get(i).data["application/vnd.vegalite.v2+json"]) {
              if (
                !!(outputs.get(i).data[
                  "application/vnd.vegalite.v2+json"
                ] as any).vconcat
              ) {
                var JSONobject = (outputs.get(i).data[
                  "application/vnd.vegalite.v2+json"
                ] as any).vconcat["0"];
              } else {
                var JSONobject = outputs.get(i).data[
                  "application/vnd.vegalite.v2+json"
                ] as any;
              }
              let context = docManager.contextForWidget(cur) as Context<
                DocumentRegistry.IModel
              >;
              var wdg = new VoyagerPanel_DF(
                JSONobject,
                filename,
                context,
                false,
                app,
                docManager
              );
              wdg.data_src = JSONobject;
              wdg.id = filename+(temp_widget_counter++);
              wdg.title.closable = true;
              wdg.title.iconClass = VOYAGER_ICON;
              const tracker = new InstanceTracker<VoyagerPanel_DF>({ namespace: 'VoyagerPanel_DataFrame' });
              tracker.add(wdg);
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

  /**
   * create and add the command to open a notebook table in Voyager
   */
  commands.addCommand(CommandIDs.JL_Table_Voyager, {
    label: 'Open table in Voyager',
    caption: 'Open the datasource in Voyager',
    execute: args => {
      const cur = getCurrent(args);
      if (cur) {
        var filename = cur.id + "_Voyager";
        let cell = cur.content.activeCell;
        if (cell && cell.model.type === "code") {
          let codeCell = cur.content.activeCell as CodeCell;
          let outputs = codeCell.model.outputs;
          let i = 0;
          /** find the first dataframe output of this cell,
           * (if multiple dataframes in one cell, currently there's no method to locate,
           * so only select the first one by default)
           */
          while (i < outputs.length) {
            if (!!outputs.get(i).data["application/vnd.dataresource+json"]) {
              var JSONobject = (outputs.get(i).data[
                "application/vnd.dataresource+json"
              ] as any).data;
              let context = docManager.contextForWidget(cur) as Context<
                DocumentRegistry.IModel
              >;
              var wdg = new VoyagerPanel_DF(
                { values: JSONobject },
                filename,
                context,
                true,
                app,
                docManager
              );
              wdg.data_src = { values: JSONobject };
              wdg.id = filename + temp_widget_counter++;
              wdg.title.closable = true;
              wdg.title.iconClass = VOYAGER_ICON;
              const tracker = new InstanceTracker<VoyagerPanel_DF>({ namespace: 'VoyagerPanel_DataFrame' });
              tracker.add(wdg);
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

  /**
   * create and add the command to save the Voyager content
   */
  commands.addCommand(CommandIDs.JL_Voyager_Save, {
    label: '     ',
    caption: 'Save the chart datasource as vl.json file',
    execute: args => {
      let widget = app.shell.currentWidget;
      if (widget) {
        var datavoyager = (widget as VoyagerPanel).voyager_cur;
        var dataSrc = (widget as VoyagerPanel).data_src;
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
        context.save();
      }
    },
    isEnabled: () =>{
      return false;
    }
  });

  /**
   * create and add the command to save the Voyager content
   */
  commands.addCommand(CommandIDs.JL_Voyager_Save1, {
    label: 'Save Voyager Chart',
    caption: 'Save the chart datasource as vl.json file',
    execute: args => {
      let widget = app.shell.currentWidget;
      if(widget){
        var datavoyager = (widget as VoyagerPanel).voyager_cur;
        var dataSrc = (widget as VoyagerPanel).data_src;
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
        context.save();
      }
    },
    isEnabled: () =>{
      let widget = app.shell.currentWidget;
      if (
        widget &&
        widget.hasClass(Voyager_CLASS) &&
        (widget as VoyagerPanel).context.path.indexOf('vl.json') !== -1
      ) {
        return true;
      } else {
        return false;
      }
    }
  });

  /**
   * create and add the command to export the Voyager content
   */
  commands.addCommand(CommandIDs.JL_Voyager_Export, {
    label: 'Export Voyager as Vega-Lite File',
    caption: 'Export the chart datasource as vl.json file',
    execute: args => {
      let widget = app.shell.currentWidget;
      if (widget) {
        var datavoyager = (widget as VoyagerPanel | VoyagerPanel_DF)
          .voyager_cur;
        var dataSrc = (widget as VoyagerPanel | VoyagerPanel_DF).data_src;
        let context = docManager.contextForWidget(widget) as Context<
          DocumentRegistry.IModel
        >;
        let path = PathExt.dirname(context.path);
        let spec = datavoyager.getSpec(false);
        if (spec !== undefined) {
          createNew(
            path,
            {
              data: dataSrc,
              mark: spec.mark,
              encoding: spec.encoding,
              height: spec.height,
              width: spec.width,
              description: spec.description,
              name: spec.name,
              selection: spec.selection,
              title: spec.title,
              transform: spec.transform
            },
            false
          );
        } else {
          createNew(
            path,
            {
              data: dataSrc
            },
            false
          );
        }
      }
    },
    isEnabled: () => {
      let widget = app.shell.currentWidget;
      if(widget&&widget.hasClass(Voyager_CLASS)&&(widget as VoyagerPanel|VoyagerPanel_DF).context.path.indexOf('vl.json')===-1){
          return true;
      }
      else{
        return false;
      }
    }
  });

  /**
   * create and add the command to export the Voyager content to notebook(copy it to clipboard)
   */
  commands.addCommand(CommandIDs.JL_Voyager_Export_To_Notebook, {
    label: 'Copy Altair Graph to clipboard',
    caption: 'Copy the Altair graph python code to clipboard',
    execute: args => {
      let widget = app.shell.currentWidget;
      if (widget) {
        var datavoyager = (widget as VoyagerPanel | VoyagerPanel_DF)
          .voyager_cur;
        var dataSrc = (widget as VoyagerPanel | VoyagerPanel_DF).data_src;
        let spec = datavoyager.getSpec(false);
        let src = JSON.stringify({
          data: dataSrc,
          mark: spec.mark,
          encoding: spec.encoding,
          height: spec.height,
          width: spec.width,
          description: spec.description,
          name: spec.name,
          selection: spec.selection,
          title: spec.title,
          transform: spec.transform
        });
        let clipboard = Clipboard.getInstance();
        clipboard.clear();
        let data = [
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [
              "import altair as alt\n",
              "import pandas as pd\n",
              "import json\n",
              `data_src = json.loads('''${src}''')\n`,
              "alt.Chart.from_dict(data_src)\n"
            ]
          }
        ];
        clipboard.setData(JUPYTER_CELL_MIME, data);
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

  /**
   * create and add the command to show or hide the toolbar inside Voyager UI
   */
  commands.addCommand(CommandIDs.JL_Voyager_HideBar, {
    label: "Show/Hide Toolbar",
    caption: "show or hide toolbar in voyager",
    execute: args => {
      let widget = app.shell.currentWidget;
      if (widget) {
        if ((widget as VoyagerPanel | VoyagerPanel_DF).toolbar.isHidden) {
          (widget as VoyagerPanel | VoyagerPanel_DF).toolbar.show();
        } else {
          (widget as VoyagerPanel | VoyagerPanel_DF).toolbar.hide();
        }
      }
    },
    isEnabled: () => {
      let widget = app.shell.currentWidget;
      if (widget && widget.hasClass(Voyager_CLASS)) {
        return true;
      } else {
        return false;
      }
    }
  });

  /**
   * create and add the command to undo the last operation in Voyager
   */
  commands.addCommand(CommandIDs.JL_Voyager_Undo, {
    label: "Undo",
    caption: "Update state to reflect the previous state",
    execute: args => {
      let widget = app.shell.currentWidget;
      if (widget) {
        (widget as VoyagerPanel | VoyagerPanel_DF).voyager_cur.undo();
      }
    }
  });

  /**
   * create and add the command to redo the previously canceled operation in Voyager
   */
  commands.addCommand(CommandIDs.JL_Voyager_Redo, {
    label: "Redo",
    caption: "Update state to reflect the future state",
    execute: args => {
      let widget = app.shell.currentWidget;
      if (widget) {
        (widget as VoyagerPanel | VoyagerPanel_DF).voyager_cur.redo();
      }
    }
  });

  // Track and restore the tutorial widget state
  let tracker0 = new InstanceTracker<VoyagerTutorialWidget>({
    namespace: "voyager_tutorial"
  });
  const command: string = CommandIDs.JL_Voyager_Tutorial;
  restorer.restore(tracker0, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => 'voyager_tutorial'
  });

  /**
   * create and add the command to display the tutorial page
   */
  commands.addCommand(CommandIDs.JL_Voyager_Tutorial, {
    label: 'Voyager FAQ',
    caption: 'Open tutorial page for JupyterLab_voyager',
    execute: args => {
      if (!T_widget) {
        // Create a new widget if one does not exist
        let content = rendermime.createRenderer("text/markdown");
        const model = rendermime.createModel({
          data: { "text/markdown": SOURCE }
        });
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

  //Add the tutorial command into top menu 'Help' button
  mainMenu.helpMenu.addGroup([{ command: CommandIDs.JL_Voyager_Tutorial }], 0);

  //Add the 'Save' and 'Export' command into top menu 'File' button
  mainMenu.fileMenu.addGroup(
    [
      { command: CommandIDs.JL_Voyager_Save },
      { command: CommandIDs.JL_Voyager_Export }
    ],
    10
  );

  //add phosphor context menu for voyager_dataframe, for the "save", "export", "show/hide toolbar", "undo", "redo" functions
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Undo,
    selector: ".voyager",
    rank: 0
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Redo,
    selector: ".voyager",
    rank: 1
  });
  app.contextMenu.addItem({
    type: "separator",
    selector: ".voyager",
    rank: 2
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_HideBar,
    selector: ".voyager",
    rank: 3
  });
  app.contextMenu.addItem({
    type: "separator",
    selector: ".voyager",
    rank: 4
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Save1,
    selector: ".voyager",
    rank: 5
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Export,
    selector: ".voyager",
    rank: 6
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Voyager_Export_To_Notebook,
    selector: ".voyager",
    rank: 7
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

  //add context menu for table ouput
  app.contextMenu.addItem({
    command: CommandIDs.JL_Table_Voyager,
    selector: ".dataframe"
  });

  //add tsv file type to docRegistry to support "Open With ..." context menu;
  app.docRegistry.addFileType({
    name: 'tsv',
    extensions: ['.tsv']
  });

  // Track and restore the Voyager widget state
  const factoryName1 = `Voyager`;
  const tracker1 = new InstanceTracker<IDocumentWidget<VoyagerPanel>>({
    namespace: factoryName1
  });
  const factory1 = new VoyagerWidgetFactory(app, docManager, {
    name: factoryName1,
    fileTypes: ["csv", "json", "tsv", "vega-lite2", "vega3"],
    readOnly: true
  });

  // Handle state restoration.
  restorer.restore(tracker1, {
    command: "docmanager:open",
    args: widget => ({ path: widget.context.path, factory: factoryName1 }),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory1);

  factory1.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    widget.id = widget.id;
    widget.title.icon = VOYAGER_ICON;
    widget.context.pathChanged.connect(() => {
      tracker1.save(widget);
    });
    tracker1.add(widget);
  });

  fileTypes.map(ft => {
    let ftObj = app.docRegistry.getFileType(ft);
    if (ftObj == undefined) {
      console.log("app docreg getfile type: undefined");
    } else {
      console.log("app docreg getfile type: " + ftObj.name);
    }
  });

  // Track and restore the notebook widget state (for opening vegalite file in notebook)
  const factoryName2 = `Vegalite in New Notebook`;
  const tracker2 = new InstanceTracker<NotebookPanel>({
    namespace: factoryName2
  });
  const factory2 = new VoyagerNotebookWidgetFactory(app, {
    name: factoryName2,
    fileTypes: ["vega-lite2", "vega3"],
    readOnly: true
  });

  // Handle state restoration.
  restorer.restore(tracker2, {
    command: "docmanager:open",
    args: widget => ({ path: widget.context.path, factory: factoryName2 }),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory2);
  factory2.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker2.add(widget);
    widget.context.pathChanged.connect(() => {
      tracker2.save(widget);
    });
    widget.title.iconClass = VOYAGER_ICON;
  });

  fileTypes_vega.map(ft => {
    let ftObj = app.docRegistry.getFileType(ft);
    if (ftObj == undefined) {
      console.log('app docreg getfile type: undefined');
    } else {
      console.log('app docreg getfile type: ' + ftObj.name);
    }
   })
}

//const plugin: JupyterLabPlugin<InstanceTracker<VoyagerPanel>> = {
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: "jupyterlab_voyager:plugin",
  autoStart: true,
  requires: [
    ILayoutRestorer,
    INotebookTracker,
    IDocumentManager,
    IMainMenu,
    IRenderMimeRegistry
  ]
};
export default plugin;
