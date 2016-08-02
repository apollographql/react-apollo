
import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import mockNetworkInterface from '../../mocks/mockNetworkInterface';
import {
  // Passthrough,
  ProviderMock,
} from '../../mocks/components';

import graphql from '../../../src/graphql';

describe('queries', () => {

  it('binds a query to props', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    const ContainerWithData =  graphql(query)(({ people }) => {
      expect(people).to.exist;
      expect(people.loading).to.be.true;
      return null;
    });

    mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
  });

  it('includes the variables in the props', () => {
    const query = gql`query people ($first: Int) { allPeople(first: $first) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface });

    const ContainerWithData =  graphql(query)(({ people }) => {
      expect(people).to.exist;
      expect(people.variables).to.deep.equal(variables);
      return null;
    });

    mount(<ProviderMock client={client}><ContainerWithData first={1} /></ProviderMock>);
  });

  it('does not swallow children errors', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });
    let bar;
    const ContainerWithData =  graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    try {
      mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
      done(new Error('component should have thrown'));
    } catch (e) {
      expect(e).to.match(/TypeError/);
      done();
    }

  });

  it('executes a query', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.people.loading).to.be.false;
        expect(props.people.allPeople).to.deep.equal(data.allPeople);
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('executes a query with two root fields', (done) => {
    const query = gql`query people {
      allPeople(first: 1) { people { name } }
      otherPeople(first: 1) { people { name } }
    }`;
    const data = {
      allPeople: { people: [ { name: 'Luke Skywalker' } ] },
      otherPeople: { people: [ { name: 'Luke Skywalker' } ] },
    };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.people.loading).to.be.false;
        expect(props.people.allPeople).to.deep.equal(data.allPeople);
        expect(props.people.otherPeople).to.deep.equal(data.otherPeople);
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('can unmount without error', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    const ContainerWithData =  graphql(query)(() => null);

    const wrapper = mount(
      <ProviderMock client={client}><ContainerWithData /></ProviderMock>
    ) as any;

    try {
      wrapper.unmount();
      done();
    } catch (e) { done(e); }
  });

  // // it('passes any GraphQL errors in props', (done) => {
  // //   const query = gql`query people { allPeople(first: 1) { people { name } } }`;
  // //   const networkInterface = mockNetworkInterface({ request: { query }, error: new Error('boo') });
  // //   const client = new ApolloClient({ networkInterface });

  // //   @graphql(query)
  // //   class ErrorContainer extends React.Component<any, any> {
  // //     componentWillReceiveProps({ people }) {
  // //       expect(people.error).to.exist;
  // //       done();
  // //     }
  // //     render() {
  // //       return null;
  // //     }
  // //   };

  // //   mount(<ProviderMock client={client}><ErrorContainer /></ProviderMock>);
  // // });

  it('maps props as variables if they match', (done) => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.people.loading).to.be.false;
        expect(props.people.allPeople).to.deep.equal(data.allPeople);
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container first={1} /></ProviderMock>);
  });

  it('allows falsy values in the mapped variables from props', (done) => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: null };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.people.loading).to.be.false;
        expect(props.people.allPeople).to.deep.equal(data.allPeople);
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container first={null} /></ProviderMock>);
  });

  it('errors if the passed props don\'t contain the needed variables', () => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface });
    const Container =  graphql(query)(() => null);

    try {
      mount(<ProviderMock client={client}><Container frst={1} /></ProviderMock>);
    } catch (e) {
      expect(e).to.match(/Invariant Violation: The operation 'people'/);
    }

  });

  it('rebuilds the queries on prop change when using `mapPropsToOptions`', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });


    let firstRun = true;
    let isDone = false;
    function mapPropsToOptions(props) {
      if (!firstRun) {
        expect(props.listId).to.equal(2);
        if (!isDone) done();
        isDone = true;
      }
      return {};
    };

    const Container = graphql(query, mapPropsToOptions)((props) => null);

    class ChangingProps extends React.Component<any, any> {
      state = { listId: 1 };

      componentDidMount() {
        setTimeout(() => {
          firstRun = false;
          this.setState({ listId: 2 });
        }, 50);
      }

      render() {
        return <Container listId={this.state.listId} />;
      }
    }

    mount(<ProviderMock client={client}><ChangingProps /></ProviderMock>);
  });

  it('allows you to skip a query', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    let queryExecuted;
    @graphql(query, () => ({ skip: true }))
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        queryExecuted = true;
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);

    setTimeout(() => {
      if (!queryExecuted) { done(); return; }
      done(new Error('query ran even though skip present'));
    }, 25);
  });

  it('reruns the query if it changes', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface });

    @graphql(query, (props) => ({ variables: props, returnPartialData: count === 0 }))
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        // loading is true, but data still there
        if (count === 1 && people.loading) {
          expect(people.allPeople).to.deep.equal(data1.allPeople);
        }
        if (count === 1 && !people.loading && this.props.people.loading) {
          expect(people.allPeople).to.deep.equal(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    mount(<ProviderMock client={client}><ChangingProps /></ProviderMock>);
  });

  it('reruns the query if just the variables change', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface });

    @graphql(query, (props) => ({ variables: props }))
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        // loading is true, but data still there
        if (count === 1 && people.loading) {
          expect(people.allPeople).to.deep.equal(data1.allPeople);
        }
        if (count === 1 && !people.loading && this.props.people.loading) {
          expect(people.allPeople).to.deep.equal(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    mount(<ProviderMock client={client}><ChangingProps /></ProviderMock>);
  });

  it('reruns the queries on prop change when using passed props', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        // loading is true, but data still there
        if (count === 1 && people.loading) {
          expect(people.allPeople).to.deep.equal(data1.allPeople);
        }
        if (count === 1 && !people.loading && this.props.people.loading) {
          expect(people.allPeople).to.deep.equal(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    mount(<ProviderMock client={client}><ChangingProps /></ProviderMock>);
  });

  it('exposes refetch as part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface });

    let hasRefetched;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        if (hasRefetched) return;
        hasRefetched = true;
        expect(people.refetch).to.be.exist;
        expect(people.refetch).to.be.instanceof(Function);
        people.refetch()
          .then(result => {
            expect(result.data).to.deep.equal(data);
            done();
          })
          .catch(done);
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('exposes fetchMore as part of the props api', (done) => {
    const query = gql`
      query people($skip: Int) { allPeople(first: 1, skip: $skip) { people { name } } }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data1 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables = { skip: 1 };
    const variables2 = { skip: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data1 } }
    );
    const client = new ApolloClient({ networkInterface });

    let count = 0;
    @graphql(query, () => ({ variables }))
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        if (count === 0) {
          expect(people.fetchMore).to.be.exist;
          expect(people.fetchMore).to.be.instanceof(Function);
          people.fetchMore({
            variables: variables2,
            updateQuery: (prev, { fetchMoreResult }) => ({
              allPeople: {
                people: prev.allPeople.people.concat(fetchMoreResult.data.allPeople.people),
              },
            }),
          });
        } else if (count === 1) {
          expect(people.loading).to.be.true;
          expect(people.allPeople).to.deep.equal(data.allPeople);
        } else if (count === 2) {
          expect(people.loading).to.be.false;
          expect(people.allPeople.people).to.deep.equal(
            data.allPeople.people.concat(data1.allPeople.people)
          );
          done();
        } else {
          done(new Error('should not reach this point'));
        }
        count++;
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('exposes stopPolling as part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        expect(people.stopPolling).to.be.exist;
        expect(people.stopPolling).to.be.instanceof(Function);
        expect(people.stopPolling).to.not.throw;
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('exposes startPolling as part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        expect(people.startPolling).to.be.exist;
        expect(people.startPolling).to.be.instanceof(Function);
        expect(people.startPolling).to.not.throw;
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });


  it('resets the loading state after a refetched query', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface });

    let isRefectching;
    let refetched;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        // get new data with no more loading state
        if (refetched) {
          expect(people.loading).to.be.false;
          expect(people.allPeople).to.deep.equal(data2.allPeople);
          done();
          return;
        }

        // don't remove old data
        if (isRefectching) {
          isRefectching = false;
          refetched = true;
          expect(people.loading).to.be.true;
          expect(people.allPeople).to.deep.equal(data.allPeople);
          return;
        }

        if (!isRefectching) {
          isRefectching = true;
          people.refetch();
        }
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });
  it('resets the loading state after a refetched query even if the data doesn\'t change', (d) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface });

    let isRefectching;
    let refetched;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ people }) {
        // get new data with no more loading state
        if (refetched) {
          expect(people.loading).to.be.false;
          expect(people.allPeople).to.deep.equal(data.allPeople);
          d();
          return;
        }

        // don't remove old data
        if (isRefectching) {
          isRefectching = false;
          refetched = true;
          expect(people.loading).to.be.true;
          expect(people.allPeople).to.deep.equal(data.allPeople);
          return;
        }

        if (!isRefectching) {
          isRefectching = true;
          people.refetch();
        }
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('allows a polling query to be created', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface });

    let count = 0;
    const Container = graphql(query, () => ({ pollInterval: 75 }))(() => {
      count++;
      return null;
    });

    const wrapper = mount(<ProviderMock client={client}><Container /></ProviderMock>);

    setTimeout(() => {
      expect(count).to.equal(3);
      (wrapper as any).unmount();
      done();
    }, 160);
  });

  it('allows custom mapping of a result to props', () => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    const mapResultToProps = ({ loading }) => ({ showSpinner: loading });
    const ContainerWithData = graphql(query, null, mapResultToProps)(({ thing }) => {
      expect(thing.showSpinner).to.be.true;
      return null;
    });

    mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
  });

  it('allows custom mapping of a result to props', (done) => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    const mapResultToProps = ({ getThing }) => ({ thingy: getThing });

    @graphql(query, null, mapResultToProps)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.thing.thingy).to.deep.equal(data.getThing);
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

});
