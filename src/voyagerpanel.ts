///<reference path="./lib.d.ts"/>

import path = require("path");

import {
  ActivityMonitor,
  PathExt,
  ISettingRegistry
} from "@jupyterlab/coreutils";

import {
  Toolbar,
  ToolbarButton,
  Clipboard,
  Dialog,
  showDialog,
  showErrorMessage
} from "@jupyterlab/apputils";

import {
  DocumentWidget,
  Context,
  DocumentRegistry
} from "@jupyterlab/docregistry";

import { Widget, BoxLayout } from "@phosphor/widgets";

import { Message } from "@phosphor/messaging";

import { IDocumentManager, DocumentManager } from "@jupyterlab/docmanager";

import { ISignal, Signal } from "@phosphor/signaling";

import { CreateVoyager, Voyager } from "datavoyager/build/lib-voyager";
import { VoyagerConfig } from "datavoyager/build/models/config";
import "datavoyager/build/style.css";
import { read } from "vega-loader";

import { PromiseDelegate } from "@phosphor/coreutils";

import "../style/index.css";
import { JupyterLab } from "@jupyterlab/application";

/**
 * The mimetype used for Jupyter cell data.
 */
const JUPYTER_CELL_MIME = "application/vnd.jupyter.cells";

const VOYAGER_PANEL_TOOLBAR_CLASS = "jp-VoyagerPanel-toolbar";

/**
 * The class name added to toolbar save button.
 */
const TOOLBAR_SAVE_CLASS = "jp-SaveIcon";

/**
 * The class name added to toolbar insert button.
 */
const TOOLBAR_EXPORT_CLASS = "jp-ExportIcon";

/**
 * The class name added to toolbar insert button.
 */
const TOOLBAR_COPY_CLASS = "jp-CopyIcon";

/**
 * The class name added to toolbar cut button.
 */
const TOOLBAR_UNDO_CLASS = "jp-UndoIcon";

/**
 * The class name added to toolbar copy button.
 */
const TOOLBAR_REDO_CLASS = "jp-RedoIcon";

/**
 * The class name added to a datavoyager widget.
 */
const Voyager_CLASS = "jp-Voyager";

export class VoyagerPanel extends DocumentWidget<Widget> {
  public voyager_cur!: Voyager;
  public data_src: any;
  public fileType: String;

  constructor(
    options: DocumentWidget.IOptions<Widget>,
    app: JupyterLab,
    docManager: IDocumentManager
  ) {
    super({ ...options, content: new Widget() });
    this.addClass(Voyager_CLASS);
    this.fileType = PathExt.extname(this.context.localPath).substring(1);

    this.title.label = PathExt.basename(this.context.path);

    this.context.model.contentChanged.connect(this.update, this);
    this.context.fileChanged.connect(this.update, this);

    this.context.ready.then(() => {
      const data = this.context.model.toString();
      var values: any;
      if (this.fileType === "txt") {
        values = read(data, { type: "json" });
      } else {
        values = read(data, { type: this.fileType });
      }
      if (this.fileType === "json" || this.fileType === "txt") {
        if (values["data"]) {
          var DATA = values["data"];
          this.data_src = DATA;
          if (DATA["url"]) {
            //check if it's url type datasource
            if (!Private.isValidURL(DATA["url"])) {
              let basePath = PathExt.dirname(this.context.localPath);
              let wholePath = path.join(basePath, DATA["url"]);
              docManager.services.contents.get(wholePath).then(src => {
                let local_filetype = PathExt.extname(DATA["url"]).substring(1);
                let local_values = read(src.content, { type: local_filetype });
                this.voyager_cur = CreateVoyager(
                  this.content.node,
                  Private.VoyagerConfig as VoyagerConfig,
                  { values: local_values }
                );
                this.voyager_cur.setSpec({
                  mark: values["mark"],
                  encoding: values["encoding"],
                  height: values["height"],
                  width: values["width"],
                  description: values["description"],
                  name: values["name"],
                  selection: values["selection"],
                  title: values["title"],
                  transform: values["transform"]
                });
              });
            } else {
              this.voyager_cur = CreateVoyager(
                this.content.node,
                Private.VoyagerConfig as VoyagerConfig,
                values["data"]
              );
            }
          } else if (DATA["values"]) {
            //check if it's array value data source
            this.voyager_cur = CreateVoyager(
              this.content.node,
              Private.VoyagerConfig as VoyagerConfig,
              values["data"]
            );
          } else {
            //other conditions, just try to pass the value to voyager and wish the best
            this.voyager_cur = CreateVoyager(
              this.content.node,
              Private.VoyagerConfig as VoyagerConfig,
              values["data"]
            );
            this.data_src = values["data"];
          }
        } else {
          //other conditions, just try to pass the value to voyager and wish the best
          this.voyager_cur = CreateVoyager(
            this.content.node,
            Private.VoyagerConfig as VoyagerConfig,
            { values }
          );
          this.data_src = { values };
        }

        //update the specs if possible
        this.voyager_cur.setSpec({
          mark: values["mark"],
          encoding: values["encoding"],
          height: values["height"],
          width: values["width"],
          description: values["description"],
          name: values["name"],
          selection: values["selection"],
          title: values["title"],
          transform: values["transform"]
        });
      } else {
        this.voyager_cur = CreateVoyager(
          this.content.node,
          Private.VoyagerConfig as VoyagerConfig,
          { values }
        );
        this.data_src = { values };
      }
    });

    // Toolbar
    this.toolbar.addClass(VOYAGER_PANEL_TOOLBAR_CLASS);
    this.toolbar.addItem("save", Private.createSaveButton(this));
    this.toolbar.addItem(
      "saveAs",
      Private.createExportButton(this, app, docManager)
    );
    this.toolbar.addItem(
      "ExportToNotebook",
      Private.createCopyButton(this, app, docManager)
    );
    this.toolbar.addItem("undo", Private.createUndoButton(this));
    this.toolbar.addItem("redo", Private.createRedoButton(this));
  }

  /**
   * The plugin settings.
   */
  get settings(): ISettingRegistry.ISettings | null {
    return this._settings;
  }
  set settings(settings: ISettingRegistry.ISettings | null) {
    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsChanged, this);
    }
    this._settings = settings;
    if (this._settings) {
      this._settings.changed.connect(this._onSettingsChanged, this);
    }
    this.update();
  }
  /**
   * Handle setting changes.
   */
  private _onSettingsChanged(): void {
    this.update();
  }

  private _settings: ISettingRegistry.ISettings | null = null;

  /**
   * A signal that emits when editor layout state changes and needs to be saved.
   */
  get stateChanged(): ISignal<this, void> {
    return this._stateChanged;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.content.node.tabIndex = -1;
    this.content.node.focus();
  }

  private _stateChanged = new Signal<this, void>(this);
}

/**Special VoyagerPanel for using dataframe as data src */
export class VoyagerPanel_DF extends DocumentWidget<Widget> {
  public voyager_cur!: Voyager;
  public data_src: any;
  public fileType = "tempory";

  constructor(
    data: any,
    fileName: string,
    context: Context<DocumentRegistry.IModel>,
    isTable: boolean,
    app: JupyterLab,
    docManager: IDocumentManager
  ) {
    super({ context, content: new Widget() });
    this.addClass(Voyager_CLASS);

    this.context.ready.then(() => {
      if (isTable) {
        this.voyager_cur = CreateVoyager(
          this.content.node,
          Private.VoyagerConfig as VoyagerConfig,
          data
        );
      } else {
        var DATA = data["data"];
        this.data_src = DATA;
        if (DATA["url"]) {
          if (!Private.isValidURL(DATA["url"])) {
            let basePath = PathExt.dirname(this.context.localPath);
            let filePath = PathExt.basename(DATA["url"]);
            let wholePath = path.join(basePath, filePath);

            docManager.services.contents.get(wholePath).then(src => {
              let local_filetype = PathExt.extname(DATA["url"]).substring(1);
              let local_values = read(src.content, { type: local_filetype });
              this.voyager_cur = CreateVoyager(
                this.content.node,
                Private.VoyagerConfig as VoyagerConfig,
                { values: local_values }
              );
            });
          } else {
            this.voyager_cur = CreateVoyager(
              this.content.node,
              Private.VoyagerConfig as VoyagerConfig,
              data["data"]
            );
          }
        } else if (DATA["values"]) {
          //check if it's array value data source
          this.voyager_cur = CreateVoyager(
            this.content.node,
            Private.VoyagerConfig as VoyagerConfig,
            data["data"]
          );
        } else {
          //other conditions, just try to pass the value to voyager and wish the best
          this.voyager_cur = CreateVoyager(
            this.content.node,
            Private.VoyagerConfig as VoyagerConfig,
            data["data"]
          );
        }
        this.voyager_cur.setSpec({
          mark: data["mark"],
          encoding: data["encoding"],
          height: data["height"],
          width: data["width"],
          description: data["description"],
          name: data["name"],
          selection: data["selection"],
          title: data["title"],
          transform: data["transform"]
        });
      }
      this.title.label = fileName;
    });

    // Toolbar
    this.toolbar.addClass(VOYAGER_PANEL_TOOLBAR_CLASS);
    this.toolbar.addItem("save", Private.createSaveButton(this));
    this.toolbar.addItem(
      "saveAs",
      Private.createExportButton(this, app, docManager)
    );
    this.toolbar.addItem(
      "ExportToNotebook",
      Private.createCopyButton(this, app, docManager)
    );
    this.toolbar.addItem("undo", Private.createUndoButton(this));
    this.toolbar.addItem("redo", Private.createRedoButton(this));
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.content.node.tabIndex = -1;
    this.content.node.focus();
  }
}

export function isValidFileName(name: string): boolean {
  const validNameExp = /[\/\\:]/;
  return name.length > 0 && !validNameExp.test(name);
}

namespace Private {
  export const VoyagerConfig = {
    // don't allow user to select another data source from Voyager UI
    showDataSourceSelector: false,
    serverUrl: null,
    hideHeader: true,
    hideFooter: true,
    relatedViews: "initiallyCollapsed",
    wildcards: "enabled"
  };

  export function createSaveButton(
    widget: VoyagerPanel | VoyagerPanel_DF
  ): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_SAVE_CLASS,
      onClick: () => {
        if (
          widget &&
          widget.hasClass(Voyager_CLASS) &&
          (widget as VoyagerPanel).context.path.indexOf("vl.json") !== -1
        ) {
          var datavoyager = (widget as VoyagerPanel).voyager_cur;
          var dataSrc = (widget as VoyagerPanel).data_src;
          let spec = datavoyager.getSpec(false);
          let context = widget.context as Context<DocumentRegistry.IModel>;
          context.model.fromJSON({
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
          context.save();
        } else {
          showDialog({
            title: "Source File Type is NOT Vega-Lite (.vl.json)",
            body: "To save this chart, use 'Export Voyager as Vega-Lite file' ",
            buttons: [Dialog.warnButton({ label: "OK" })]
          });
        }
      },
      tooltip: "Save Voyager"
    });
  }

  export function createExportButton(
    widget: VoyagerPanel | VoyagerPanel_DF,
    app: JupyterLab,
    docManager: DocumentManager
  ): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_EXPORT_CLASS,
      onClick: () => {
        var datavoyager = (widget as VoyagerPanel).voyager_cur;
        var dataSrc = (widget as VoyagerPanel).data_src;
        //let aps = datavoyager.getApplicationState();
        let spec = datavoyager.getSpec(false);
        //let context = docManager.contextForWidget(widget) as Context<DocumentRegistry.IModel>;
        let context = widget.context as Context<DocumentRegistry.IModel>;
        let path = PathExt.dirname(context.path);
        var content: any;
        if (spec !== undefined) {
          content = {
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
          };
        } else {
          content = {
            data: dataSrc
          };
        }
        let input_block = document.createElement("div");
        let input_prompt = document.createElement("div");
        input_prompt.textContent = "";
        let input = document.createElement("input");
        input_block.appendChild(input_prompt);
        input_block.appendChild(input);
        let bd = new Widget({ node: input_block });
        showDialog({
          title: "Export as Vega-Lite File (.vl.json)",
          body: bd,
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: "OK" })]
        }).then(result => {
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
              let basePath = path;
              let newPath = PathExt.join(
                basePath,
                msg.indexOf(".vl.json") !== -1 ? msg : msg + ".vl.json"
              );
              app.commands
                .execute("docmanager:new-untitled", {
                  path: basePath,
                  ext: ".vl.json",
                  type: "file"
                })
                .then(model => {
                  docManager.rename(model.path, newPath).then(model => {
                    app.commands
                      .execute("docmanager:open", {
                        path: model.path,
                        factory: "Editor"
                      })
                      .then(widget => {
                        let context = docManager.contextForWidget(widget);
                        if (context != undefined) {
                          context.save().then(() => {
                            if (context != undefined) {
                              context.model.fromJSON(content);
                              context.save();
                            }
                          });
                        }
                      });
                  });
                });
            }
          }
        });
      },
      tooltip: "Export Voyager as Vega-Lite File"
    });
  }

  export function createCopyButton(
    widget: VoyagerPanel | VoyagerPanel_DF,
    app: JupyterLab,
    docManager: DocumentManager
  ): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_COPY_CLASS,
      onClick: () => {
        var datavoyager = widget.voyager_cur;
        var dataSrc = widget.data_src;
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
      },
      tooltip: "Copy Altair Graph to clipboard"
    });
  }

  export function createUndoButton(
    widget: VoyagerPanel | VoyagerPanel_DF
  ): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_UNDO_CLASS,
      onClick: () => {
        (widget as VoyagerPanel).voyager_cur.undo();
      },
      tooltip: "Undo"
    });
  }

  export function createRedoButton(
    widget: VoyagerPanel | VoyagerPanel_DF
  ): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_REDO_CLASS,
      onClick: () => {
        (widget as VoyagerPanel).voyager_cur.redo();
      },
      tooltip: "Redo"
    });
  }

  export function isValidURL(str: string) {
    var a = document.createElement("a");
    a.href = str;
    return a.host && a.host != window.location.host;
  }
}
