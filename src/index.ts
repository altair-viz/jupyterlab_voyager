///<reference path="./lib.d.ts"/>

import { PathExt } from "@jupyterlab/coreutils";
import {
  ILayoutRestorer,
  JupyterLabPlugin,
  JupyterLab
} from "@jupyterlab/application";

import {
  ICommandPalette,
  InstanceTracker //, Dialog, showDialog
} from "@jupyterlab/apputils";

import {
  ABCWidgetFactory,
  DocumentRegistry,
  Context
} from "@jupyterlab/docregistry";

import { IFileBrowserFactory } from "@jupyterlab/filebrowser";

import { Widget, Menu } from "@phosphor/widgets";

import { Message } from "@phosphor/messaging";

import { IMainMenu } from "@jupyterlab/mainmenu";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { CreateVoyager, Voyager } from "datavoyager/build/lib-voyager";
import { VoyagerConfig } from "datavoyager/build/models/config";
import "datavoyager/build/style.css";
import { read } from "vega-loader";

import {
  INotebookTracker,
  NotebookPanel,
  NotebookTracker
} from "@jupyterlab/notebook";
import { CodeCell } from "@jupyterlab/cells";

import { ReadonlyJSONObject, PromiseDelegate } from "@phosphor/coreutils";

/**
 * The class name added to a datavoyager widget.
 */
const Voyager_CLASS = "jp-Voyager";

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = "Editor";

//import { ReactChild } from 'react';
export namespace CommandIDs {
  export const JL_Graph_Voyager = "graph_voyager:open";
  export const JL_Table_Voyager = "table_voyager:open";
  export const JL_Voyager_Save = "voyager_graph:save";
  export const JL_Voyager_Save1 = "voyager_graph:save1";
}
/**
 * A namespace for `VoyagerPanel` statics.
 */
export namespace VoyagerPanel {
  /**
   * Instantiation options for Voyager widgets.
   */
  export interface IOptions {
    /**
     * The document context for the Voyager being rendered by the widget.
     */
    context: DocumentRegistry.Context;
    fileType: FileType;
  }
}

// function assertNever(x: never): never {
//   throw new Error("Unexpected object: " + x);
// }

export class VoyagerPanel extends Widget
  implements DocumentRegistry.IReadyWidget {
  static config: VoyagerConfig = {
    // don't allow user to select another data source from Voyager UI
    showDataSourceSelector: false,
    manualSpecificationOnly: true,
    hideHeader: true,
    hideFooter: true
  };
  public voyager_cur: Voyager;
  public data_src: any;
  // it would make sense to resolve this promise after we have parsed the data
  // and created the Voyager component, but this will trigger an attempted
  // cleanup of the spinner element, which will already have been deleted
  // by the Voyager constructor and so will raise an exception.
  // So instead we just never resolve this promise, which still gives us the
  // spinner until Voyager overwrites the element.

  constructor({ context, fileType }: VoyagerPanel.IOptions) {
    super();
    this.addClass(Voyager_CLASS);
    this.voyager_cur = CreateVoyager(
      this.node,
      VoyagerPanel.config,
      undefined as any
    );
    this._context = context;

    this.title.label = PathExt.basename(context.path);
    context.pathChanged.connect(this._onPathChanged, this);
    this._onPathChanged();

    this._context.ready.then(_ => {
      this._ready.resolve(undefined);

      const data = context.model.toString();
      var values;
      if (fileType === "txt") {
        values = read(data, { type: "json" });
      } else {
        values = read(data, { type: fileType });
      }
      console.log({ values });
      if (fileType === "json" || fileType === "txt") {
        if (values["data"]) {
          var DATA = values["data"];
          this.data_src = DATA;
          console.log(values["data"]);
          if (DATA["url"]) {
            //check if it's url type datasource
            this.voyager_cur.updateData(values["data"]);
          } else if (DATA["values"]) {
            //check if it's array value data source
            this.voyager_cur.updateData(values["data"]);
          }
        } else {
          //other conditions, just try to pass the value to voyager and wish the best
          console.log("wishing for the best");
          this.voyager_cur.updateData({ values });
          this.data_src = { values };
        }

        //update the specs if possible
        // this.voyager_cur!.setSpec({'mark':values['mark'],'encoding':values['encoding']});
      } else {
        // assertNever(fileType);
        this.voyager_cur.updateData({ values });
        this.data_src = { values };
      }
    });
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
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
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  protected _context: DocumentRegistry.Context;
  private _ready = new PromiseDelegate<void>();
}

class VoyagerWidgetFactory extends ABCWidgetFactory<
  VoyagerPanel,
  DocumentRegistry.IModel
> {
  // pass fileType into constructor so we know what it is and can pass it to vega-loader
  // to get the data
  constructor(
    private fileType: FileType,
    options: DocumentRegistry.IWidgetFactoryOptions
  ) {
    super(options);
  }
  protected createNewWidget(context: DocumentRegistry.Context): VoyagerPanel {
    return new VoyagerPanel({ context, fileType: this.fileType });
  }
}

// so that we can type check we have covered all paths
export type FileType = "csv" | "tsv" | "json" | "txt" | "vl.json";
const fileTypes: Array<FileType> = ["csv", "tsv", "json", "txt", "vl.json"];

function activate(
  app: JupyterLab,
  restorer: ILayoutRestorer,
  tracker: NotebookTracker,
  palette: ICommandPalette,
  docManager: IDocumentManager,
  browserFactory: IFileBrowserFactory,
  mainMenu: IMainMenu
) /*: InstanceTracker<VoyagerPanel>*/ {
  console.log("loading");
  //let wdg:VoyagerPanel_DF;
  const { commands } = app;

  // Get the current cellar widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyJSONObject): NotebookPanel | null {
    const widget = tracker.currentWidget;
    const activate = args["activate"] !== false;
    if (activate && widget) {
      app.shell.activateById(widget.id);
    }
    return widget;
  }

  function createNew(cwd: string, data: any, open: boolean) {
    console.warn("creating new", { cwd, data, open });
    return commands
      .execute("docmanager:new-untitled", {
        path: cwd,
        ext: ".vl.json",
        type: "file"
      })
      .then(model => {
        return commands
          .execute("docmanager:open", {
            path: model.path,
            factory: FACTORY
          })
          .then(widget => {
            let context = docManager.contextForWidget(widget) as Context<
              DocumentRegistry.IModel
            >;
            context.model.fromJSON(data);
            context.save().then(() => {
              if (open) {
                commands.execute("docmanager:open", {
                  path: model.path,
                  factory: `Voyager (json)`
                });
              }
            });
          });
      });
  }

  commands.addCommand(CommandIDs.JL_Graph_Voyager, {
    label: "Open in Voyager",
    caption: "Open the datasource in Voyager",
    execute: args => {
      const cur = getCurrent(args);
      if (cur) {
        //var filename = cur.id+'_Voyager';
        let cell = cur.notebook.activeCell;
        if (cell.model.type === "code") {
          let codeCell = cur.notebook.activeCell as CodeCell;
          let outputs = codeCell.model.outputs;
          console.log(outputs);
          let i = 0;
          //find the first altair image output of this cell,
          //(if multiple output images in one cell, currently there's no method to locate, so only select the first one by default)
          while (i < outputs.length) {
            if (!!outputs.get(i).data["application/vnd.vegalite.v1+json"]) {
              var JSONobject = (outputs.get(i).data[
                "application/vnd.vegalite.v1+json"
              ] as any).data;
              console.log(JSONobject);
              let ll = app.shell.widgets("left");
              let fb = ll.next();
              while ((fb as any).id != "filebrowser") {
                fb = ll.next();
              }
              let path = (fb as any).model.path as string;
              createNew(path, { data: JSONobject }, true);
              break;
            }
            i++;
          }
        }
      }
    }
  });

  commands.addCommand(CommandIDs.JL_Table_Voyager, {
    label: "Open in Voyager",
    caption: "Open the datasource in Voyager",
    execute: args => {
      const cur = getCurrent(args);
      if (cur) {
        //var filename = cur.id+'_Voyager';
        let cell = cur.notebook.activeCell;
        if (cell.model.type === "code") {
          let codeCell = cur.notebook.activeCell as CodeCell;
          let outputs = codeCell.model.outputs;
          console.log(outputs);
          let i = 0;
          //find the first altair image output of this cell,
          //(if multiple output images in one cell, currently there's no method to locate, so only select the first one by default)
          while (i < outputs.length) {
            if (!!outputs.get(i).data["application/vnd.dataresource+json"]) {
              var JSONobject = (outputs.get(i).data[
                "application/vnd.dataresource+json"
              ] as any).data;
              console.log(JSONobject);
              let ll = app.shell.widgets("left");
              let fb = ll.next();
              while ((fb as any).id != "filebrowser") {
                fb = ll.next();
              }
              let path = (fb as any).model.path as string;
              createNew(path, { data: { values: JSONobject } }, true);
              break;
            }
            i++;
          }
        }
      }
    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Save, {
    label: "Save Current Voyager",
    caption: "Save the chart datasource as vl.json file",
    execute: args => {
      let widget = app.shell.currentWidget;
      if (widget) {
        var datavoyager = (widget as VoyagerPanel).voyager_cur;
        var dataSrc = (widget as VoyagerPanel).data_src;
        //let aps = datavoyager.getApplicationState();
        let spec = datavoyager!.getSpec(false);
        let context = docManager.contextForWidget(widget) as Context<
          DocumentRegistry.IModel
        >;
        context.model.fromJSON({
          data: dataSrc,
          mark: spec.mark,
          encoding: spec.encoding
        });
        //context.model.fromJSON(spec);
        context.save();
      }
    },
    isEnabled: () => {
      let widget = app.shell.currentWidget;
      if (
        widget &&
        widget.hasClass(Voyager_CLASS) &&
        (widget as VoyagerPanel).context.path.indexOf("vl.json") !== -1
      ) {
        return true;
      } else {
        return false;
      }
    }
  });

  commands.addCommand(CommandIDs.JL_Voyager_Save1, {
    label: "Save AS vl.json",
    caption: "Save the chart datasource as vl.json file",
    execute: args => {
      let widget = app.shell.currentWidget;

      if (widget) {
        var datavoyager = (widget as VoyagerPanel).voyager_cur;
        var dataSrc = (widget as VoyagerPanel).data_src;
        //let aps = datavoyager.getApplicationState();
        let spec = datavoyager!.getSpec(false);
        let context = docManager.contextForWidget(widget) as Context<
          DocumentRegistry.IModel
        >;
        context.model.fromJSON({
          data: dataSrc,
          mark: spec.mark,
          encoding: spec.encoding
        });
        //context.model.fromJSON(spec);
        context.saveAs();
        /*
          getSavePath(context.path).then(PATH=>{
            if(PATH){
              createNew(PATH, {data:{"data":dataSrc, "mark": spec.mark, "encoding": spec.encoding}}, false);
            }
          });
*/
      }
    },
    isEnabled: () => {
      let widget = app.shell.currentWidget;
      return widget instanceof VoyagerPanel;
    }
  });
  /*
  function getSavePath(path: string): Promise<string | undefined> {
    let saveBtn = Dialog.okButton({ label: 'SAVE' });
    return showDialog({
      title: 'Save File As..',
      body: new SaveWidget(path),
      buttons: [Dialog.cancelButton(), saveBtn]
    }).then(result => {
      if (result.button.label === 'SAVE') {
        return result.value as string;
      }
      return;
    });
  }
*/
  /*
   * A widget that gets a file path from a user.
   
  class SaveWidget extends Widget {

    constructor(path: string) {
      super({ node: createSaveNode(path) });
    }

    getValue(): string {
      return (this.node as HTMLInputElement).value;
    }
  }

  function createSaveNode(path: string): HTMLElement {
    let input = document.createElement('input');
    input.value = path;
    return input;
  }*/

  let menu = new Menu({ commands });
  menu.title.label = "Voyager";
  [CommandIDs.JL_Voyager_Save, CommandIDs.JL_Voyager_Save1].forEach(command => {
    menu.addItem({ command });
  });
  mainMenu.addMenu(menu, { rank: 60 });

  //add context menu for altair image ouput
  app.contextMenu.addItem({
    command: CommandIDs.JL_Graph_Voyager,
    selector:
      ".p-Widget.jp-RenderedVegaCommon.jp-RenderedVegaLite.vega-embed.jp-OutputArea-output"
  });
  app.contextMenu.addItem({
    command: CommandIDs.JL_Graph_Voyager,
    selector: ".p-Widget.jp-RenderedImage.jp-OutputArea-output"
  });

  app.contextMenu.addItem({
    command: CommandIDs.JL_Table_Voyager,
    //selector: '.p-Widget.jp-RenderedHTMLCommon.jp-RenderedHTML.jp-mod-trusted.jp-OutputArea-output'
    selector: ".dataframe"
  });

  //add tsv file type to docRegistry to support "Open With ..." context menu;
  app.docRegistry.addFileType({
    name: "tsv",
    extensions: [".tsv"]
  });
  //add txt file type to docRegistry to support "Open With ..." context menu;
  app.docRegistry.addFileType({
    name: "txt",
    extensions: [".txt"]
  });
  app.docRegistry.addFileType({
    name: "vl.json",
    extensions: [".vl.json"]
  });

  fileTypes.map(ft => {
    const factoryName = `Voyager (${ft})`;
    const tracker1 = new InstanceTracker<VoyagerPanel>({
      namespace: factoryName
    });
    const factory = new VoyagerWidgetFactory(ft, {
      name: factoryName,
      fileTypes: [ft],
      readOnly: true
    });

    // Handle state restoration.

    restorer.restore(tracker1 as any, {
      command: "docmanager:open",
      args: widget => ({ path: widget.context.path, factory: factoryName }),
      name: widget => widget.context.path
    });

    app.docRegistry.addWidgetFactory(factory);

    let ftObj = app.docRegistry.getFileType(ft);
    factory.widgetCreated.connect((sender, widget) => {
      // Track the widget.
      tracker1.add(widget);
      widget.context.pathChanged.connect(() => tracker1.save(widget));

      // set the tab icon class and label to be that of the filetype
      if (ftObj) {
        if (ftObj.iconClass) widget.title.iconClass = ftObj.iconClass;
        if (ftObj.iconLabel) widget.title.iconLabel = ftObj.iconLabel;
      }
    });
  });
}

//const plugin: JupyterLabPlugin<InstanceTracker<VoyagerPanel>> = {
const plugin: JupyterLabPlugin<void> = {
  id: "jupyterlab_voyager:plugin",
  autoStart: true,
  requires: [
    ILayoutRestorer,
    INotebookTracker,
    ICommandPalette,
    IDocumentManager,
    IFileBrowserFactory,
    IMainMenu
  ],
  activate: activate
};
export default plugin;
