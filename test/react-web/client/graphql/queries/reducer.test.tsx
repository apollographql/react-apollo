/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { NetworkInterface } from 'apollo-client';
import { connect } from 'react-redux';
import { withState } from 'recompose';

declare function require(name: string);

import { mockNetworkInterface } from '../../../../../src/test-utils';
import { ApolloProvider, graphql} from '../../../../../src';

// XXX: this is also defined in apollo-client
// I'm not sure why mocha doesn't provide something like this, you can't
// always use promises
const wrap = (done: Function, cb: (...args: any[]) => any) => (...args: any[]) => {
  try {
    return cb(...args);
  } catch (e) {
    done(e);
  }
};

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

describe('[queries] reducer', () => {

  // props reducer
  it('allows custom mapping of a result to props', () => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const props = ({ data }) => ({ showSpinner: data.loading });
    const ContainerWithData = graphql(query, { props })(({ showSpinner }) => {
      expect(showSpinner).toBe(true);
      return null;
    });

    const wrapper = renderer.create(<ApolloProvider client={client}><ContainerWithData /></ApolloProvider>);
    (wrapper as any).unmount();
  });

  it('allows custom mapping of a result to props that includes the passed props', () => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const props = ({ data, ownProps }) => {
      expect(ownProps.sample).toBe(1);
      return { showSpinner: data.loading };
    };
    const ContainerWithData = graphql(query, { props })(({ showSpinner }) => {
      expect(showSpinner).toBe(true);
      return null;
    });

    const wrapper = renderer.create(
      <ApolloProvider client={client}><ContainerWithData sample={1} /></ApolloProvider>
    );
    (wrapper as any).unmount();
  });

  it('allows custom mapping of a result to props', (done) => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { props: ({ data }) => ({ thingy: data.getThing }) }) // tslint:disable-line
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.thingy).toEqual(data.getThing);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });


});
