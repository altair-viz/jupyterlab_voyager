import {
  Message
} from '@phosphor/messaging';

import {
  Widget, 
  PanelLayout
} from '@phosphor/widgets';

import '../style/index.css';

/**
 * An VoyagerTutorial page widget.
 */
export
class VoyagerTutorialWidget extends Widget {
  /**
   * Construct a new tutorial page widget.
   */
  constructor(content: Widget) {
    super();
    this.id = 'VoyagerTutorial-jupyterlab';
    this.title.label = 'Tutorial:JupyterLab_Voyager';
    this.title.closable = true;
    this.addClass('jp-VoyagerTutorialWidget');
    let toolbar = new Widget();
    toolbar.addClass('jp-VoyagerTutorial-toolbar');  
    let layout = this.layout = new PanelLayout();
    layout.addWidget(toolbar);
    layout.addWidget(content);
  }

  /**
   * Handle update requests for the widget.
   */
    onUpdateRequest(msg: Message): void {
  }
};
