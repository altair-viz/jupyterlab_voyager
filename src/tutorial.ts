import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import '../style/index.css';

/**
 * An VoyagerTutorial viewer.
 */
export
class VoyagerTutorialWidget extends Widget {
  /**
   * Construct a new xkcd widget.
   */
  constructor(content: Widget) {
    super();

    this.id = 'VoyagerTutorial-jupyterlab';
    this.title.label = 'Tutorial:JupyterLab_Voyager';
    this.title.closable = true;
    this.addClass('jp-VoyagerTutorialWidget');
    let toolbar = new Widget();
    toolbar.addClass('jp-VoyagerTutorial-toolbar');
    /*
    let layout = this.layout = new PanelLayout();
    layout.addWidget(toolbar);
    layout.addWidget(content);
    */
    this.img = document.createElement('img');

    let img0 = document.createElement('img');
    img0.src = require('../tutorial/tutorial_pic_0.png');
    img0.className = 'jp-VoyagerTutorialCartoon';

    let img1 = document.createElement('img');
    img1.src = require('../tutorial/tutorial_pic_1.png');
    img1.className = 'jp-VoyagerTutorialCartoon';

    let img2 = document.createElement('img');
    img2.src = require('../tutorial/tutorial_pic_2.png');
    img2.className = 'jp-VoyagerTutorialCartoon';

    let img3 = document.createElement('img');
    img3.src = require('../tutorial/tutorial_pic_3.png');
    img3.className = 'jp-VoyagerTutorialCartoon1';

    let img4 = document.createElement('img');
    img4.src = require('../tutorial/tutorial_pic_4.png');
    img4.className = 'jp-VoyagerTutorialCartoon1';

    let img5 = document.createElement('img');
    img5.src = require('../tutorial/tutorial_pic_5.png');
    img5.className = 'jp-VoyagerTutorialCartoon';

    this.node.appendChild(this.img);
    this.node.appendChild(img0);
    this.node.appendChild(img1);
    this.node.appendChild(img2);
    this.node.appendChild(img3);
    this.node.appendChild(img4);
    this.node.appendChild(img5);
    this.img.insertAdjacentHTML('beforebegin',
    `
    <body class="container">

    <div class="page-header">
       <br>
       <center>
          <h1>JupyterLab_Voyager Tutorial<br></h1>
       </center>
     <br>
    </div>
    <div class="intro">
       <p>
       ‘JupyterLab_ Voyager’ is a plugin extension for JupyterLab that provides a GUI for data visualization operations
       and couples faceted browsing with visualization recommendation to support exploration of multivariate, tabular data. 
       This extension can read data from  local file or graphs and tables in notebook cell, and pass it to Voyager interface 
       to provide analytical reasoning through graphics.
       
       Main functions of this extension are listed below: 	
       </p>
    </div>
 </body> 
      `
    );
    img0.insertAdjacentHTML('beforebegin',
    `
    <body class="container">
    <div class="intro">
           <h2 class="h2">Open local files in Voyager</h2>
       <p>
       * Supported format: csv, tsv, json, vl.json</p>
       <p>
       * Method 1: open through context menu</p>
       <p>
       Right click on target file in Jupyterlab =>  select ‘open with’  => select ‘Voyager (filetype)’	
 </p>
    </div>
 </body> 
      `);
      img1.insertAdjacentHTML('beforebegin',
      `
      <body class="container">
      <div class="intro">
         <p>
         * Method 2: open through top menu bar</p>
         <p>
         Select target files in JupyterLab => Click ‘Voyager’ in top menu =>  select ‘open file in Voyager’	
   </p>
      </div>
   </body> 
        `);
        img2.insertAdjacentHTML('beforebegin',
        `
        <body class="container">
        <div class="intro">
               <h2 class="h2">Open Notebook Table&Graph in Voyager</h2>
           <p>
           * When using JupyterLab notebook cell graphs&tables as data source, a local ‘vl.json’ file containing data will be created before the voyager opens.</P>
           <p>
           * Method: open through context menu</p>
           <p>
           Right click on target graph or table  in Jupyterlab notebook cell =>  select ‘open with Voyager’	
     </p>
        </div>
     </body> 
          `);
          img2.insertAdjacentHTML('afterend',
          `
          <body class="container">
          <div class="intro">
                 <h2 class="h2">Operate and create Graphs Voyager</h2>
             <p>
             * Instructions about using Voyager can be found here:</P>
             <a href="https://github.com/vega/voyager"  target="_blank">
             <p>Voyager Instructions </p>
           </a>
          </div>
       </body> 
            `);
          img3.insertAdjacentHTML('beforebegin',
            `
            <body class="container">
            <div class="intro">
                   <h2 class="h2">Output data from Voyager</h2>
               <p>
               * The current status of Voyager can be represented by a vl.json file, which includes the datasource and the specs.</P>
               <p>
               * Save to current file</p>
               <p>
               Click ‘Voyager’ in top menu =>  select ‘Save current Voyager’
               Or 
               Use "Save" button in toolbar
               Note: In order to save to current file, this original file has to be vl.json type, 
               otherwise, the ‘Save current Voyager’ will be disbaled, and the "Save" button will give warning!	
         </p>
            </div>
         </body> 
              `);
          img4.insertAdjacentHTML('beforebegin',
              `
              <body class="container">
              <div class="intro">
              <p>
              * Save As a vl.json file</p>
              <p>
              Click ‘Voyager’ in top menu =>  select ‘Save as vl.json’
              Or 
              Use "SaveAs" button in toolbar
              Note:  
              Currently, user has to manually change the file extension to vl.json	
        </p>
              </div>
           </body> 
                `);
          img5.insertAdjacentHTML('beforebegin',
                `
                <body class="container">
                <div class="intro">
                       <h2 class="h2">Open a graph inside notebook</h2>
                   <p>
                   * vl.json file can be directly opened inside a jupyterlab notebook.</P>
                   <p>
                   Select a file, if the file selected is a valid file type (only vl.json), then the option ”Open vl.json in Notebook” inside top main menu bar “Voyager” will be enabled, and click it will open the selected file in Notebook. (note: user will need to select kernel for this new notebook file)</p>
                   <p>
                   Click ‘Voyager’ in top menu =>  select ‘Open vl.json in notebook’	
             </p>
                </div>
             </body> 
                  `);
    
  }

  /**
   * The image element associated with the widget.
   */
    readonly img: HTMLImageElement;

  /**
   * Handle update requests for the widget.
   */
    onUpdateRequest(msg: Message): void {
  }
};
