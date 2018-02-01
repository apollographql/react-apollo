import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';

describe('[queries] reducer', () => {
  // props reducer
  it('allows custom mapping of a result to props', () => {
    const query: DocumentNode = gql`
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

    interface Data {
      getThing: { thing: boolean };
    }

    interface FinalProps {
      showSpinner: boolean | undefined;
    }

    const ContainerWithData = graphql<{}, Data, {}, FinalProps>(query, {
      props: result => ({
        showSpinner: result.data && result.data.loading,
      }),
    })(({ showSpinner }: FinalProps) => {
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
    const query: DocumentNode = gql`
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
    interface Props {
      sample: number;
    }

    type FinalProps = {
      showSpinner: boolean;
    };

    const ContainerWithData = graphql<Props, Data, {}, FinalProps>(query, {
      props: ({ data, ownProps }) => {
        expect(ownProps.sample).toBe(1);
        return { showSpinner: data!.loading };
      },
    })(({ showSpinner }: FinalProps) => {
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
    const query: DocumentNode = gql`
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

    interface Data {
      getThing: { thing: boolean };
    }

    interface FinalProps {
      thingy: { thing: boolean };
    }

    const withData = graphql<{}, Data, {}, FinalProps>(query, {
      props: ({ data }) => ({ thingy: data!.getThing! }),
    });

    class Container extends React.Component<FinalProps> {
      componentWillReceiveProps(props: FinalProps) {
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
