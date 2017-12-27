import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, ChildProps, graphql } from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';

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

    interface Props {
      showSpinner: boolean;
    }
    interface Data {
      getThing: { thing: boolean };
    }

    const ContainerWithData = graphql<Props, Data>(query, {
      props: result => ({
        showSpinner: result.data && result.data.loading,
      }),
    })(({ showSpinner }) => {
      expect(showSpinner).toBeTruthy();
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
    const link = mockSingleLink({
      request: { query },
      result: { data: { getThing: { thing: true } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    interface Data {
      getThing: { thing: boolean };
    }
    type Props = {
      showSpinner: boolean;
      sample: number;
    };
    const ContainerWithData = graphql<Props, Data>(query, {
      props: ({ data, ownProps }) => {
        expect(ownProps.sample).toBe(1);
        return { showSpinner: data.loading };
      },
    })(({ showSpinner }) => {
      expect(showSpinner).toBeTruthy();
      return null;
    });

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData sample={1} />
      </ApolloProvider>,
    );
    (wrapper as any).unmount();
  });

  it('allows custom mapping of a result to props 2', done => {
    const query = gql`
      query thing {
        getThing {
          thing
        }
      }
    `;
    const expectedData = { getThing: { thing: true } };
    const link = mockSingleLink({
      request: { query },
      result: { data: expectedData },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    interface Props {
      thingy: boolean;
    }
    interface Data {
      getThing?: { thing: boolean };
    }

    const withData = graphql<Props, Data>(query, {
      props: ({ data }) => ({ thingy: data.getThing }),
    });

    class Container extends React.Component<ChildProps<Props, Data>> {
      componentWillReceiveProps(props: ChildProps<Props, Data>) {
        expect(stripSymbols(props.thingy)).toEqual(expectedData.getThing);
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
