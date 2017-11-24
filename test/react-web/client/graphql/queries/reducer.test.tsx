/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { connect } from 'react-redux';
import { withState } from 'recompose';

declare function require(name: string);

import { mockSingleLink } from '../../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../../src';

// XXX: this is also defined in apollo-client
// I'm not sure why mocha doesn't provide something like this, you can't
// always use promises
const wrap = (done: Function, cb: (...args: any[]) => any) => (
  ...args: any[]
) => {
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
    const query = gql`
      query thing {
        getThing {
          thing
        }
      }
    `;
    const data = { getThing: { thing: true } };
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    type ResultData = {
      getThing: { thing: boolean };
    };
    type ResultShape = {
      showSpinner: boolean;
    };

    const props = result => ({
      showSpinner: result.data && result.data.loading,
    });
    const ContainerWithData = graphql<ResultData, {}, ResultShape>(query, {
      props,
    })(({ showSpinner }) => {
      expect(showSpinner).toBe(true);
      return null;
    });

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    (wrapper as any).unmount();
  });

  it('allows custom mapping of a result to props that includes the passed props', () => {
    const query = gql`
      query thing {
        getThing {
          thing
        }
      }
    `;
    const data = { getThing: { thing: true } };
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const props = ({ data, ownProps }) => {
      expect(ownProps.sample).toBe(1);
      return { showSpinner: data.loading };
    };
    type ResultData = {
      getThing: { thing: boolean };
    };
    type ReducerResult = {
      showSpinner: boolean;
    };
    type Props = {
      sample: number;
    };
    const ContainerWithData = graphql<ResultData, Props, ReducerResult>(query, {
      props,
    })(({ showSpinner }) => {
      expect(showSpinner).toBe(true);
      return null;
    });

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData sample={1} />
      </ApolloProvider>,
    );
    (wrapper as any).unmount();
  });

  it('allows custom mapping of a result to props', done => {
    const query = gql`
      query thing {
        getThing {
          thing
        }
      }
    `;
    const data = { getThing: { thing: true } };
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    type Result = {
      getThing?: { thing: boolean };
    };

    type PropsResult = {
      thingy: boolean;
    };

    const withData = graphql<Result, {}, PropsResult>(query, {
      props: ({ data }) => ({ thingy: data.getThing }),
    });

    class Container extends React.Component<PropsResult, any> {
      componentWillReceiveProps(props: PropsResult) {
        expect(props.thingy).toEqual(data.getThing);
        done();
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withData(Container);

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
  });
});
