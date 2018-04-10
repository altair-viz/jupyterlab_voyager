import * as React from "react";
import * as ReactDOM from "react-dom";
import {Store} from 'redux';

import {configureStore} from 'datavoyager/build/store';
import {State, DEFAULT_VOYAGER_CONFIG} from 'datavoyager/build/models';
import {selectMainSpec} from 'datavoyager/build/selectors/result';
import {selectData} from 'datavoyager/build/selectors/dataset';
import {App} from 'datavoyager/build/components/app';
import {FacetedCompositeUnitSpec} from 'datavoyager/node_modules/vega-lite/build/src/spec';

import {Provider} from 'react-redux';

const config = {
    ...DEFAULT_VOYAGER_CONFIG,
    showDataSourceSelector: false,
    manualSpecificationOnly: true,
    hideHeader: true,
    hideFooter: true
}

export default class Voyager {
    private store: Store<State>;
    constructor(root: HTMLElement, data: any) {
        this.store = configureStore();
        ReactDOM.render(
            <Provider store={this.store}>
              <App
                dispatch={this.store.dispatch}
                data={data}
                config={config}
              />
            </Provider>,
            root
          );
    }

  /**
   *
   * Gets Vega-Lite spec of current specified view
   *
   * @returns {Readonly<Spec>}
   *
   * @memberof Voyager
   */
  public getSpec(includeData: boolean): FacetedCompositeUnitSpec {
    const spec = selectMainSpec(this.store.getState());
    if (includeData) {
      return {
        ...spec,
        data: selectData(this.store.getState()),
      };
    }

    return spec;
  }
}
