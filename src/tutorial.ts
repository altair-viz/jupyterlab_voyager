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
  constructor() {
    super();

    this.id = 'VoyagerTutorial-jupyterlab';
    this.title.label = 'Tutorial:JupyterLab_Voyager';
    this.title.closable = true;
    this.addClass('jp-VoyagerTutorialWidget');

    this.img = document.createElement('img');
    this.img.className = 'jp-VoyagerTutorialCartoon';
    this.node.appendChild(this.img);

    this.img.insertAdjacentHTML('afterend',
      `<div class="jp-VoyagerTutorialAttribution">
        <a href="https://vega.github.io/voyager/" class="jp-VoyagerTutorialAttribution" target="_blank">
        </a>
      </div>`
    );
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
