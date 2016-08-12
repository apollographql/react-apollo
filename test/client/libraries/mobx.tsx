
// import * as React from 'react';
// import * as chai from 'chai';
// import { mount } from 'enzyme';
// import { observer } from 'mobx-react';
// import { observable } from 'mobx';
// import gql from 'graphql-tag';

// import ApolloClient from 'apollo-client';

// declare function require(name: string);
// import chaiEnzyme = require('chai-enzyme');

// chai.use(chaiEnzyme()); // Note the invocation at the end
// const { expect } = chai;

// import {
//   ProviderMock,
// } from '../../mocks/components';
// import mockNetworkInterface from '../../mocks/mockNetworkInterface';


// import graphql from '../../../src/graphql';

// describe('mobx integration', () => {

//   class AppState {
//     @observable first = 0;

//     constructor() {
//       setInterval(() => {
//         if (this.first <= 2) this.first += 1;
//       }, 1000);
//     }

//     reset() {
//       this.first = 0;
//     }
//   }

//   it('works with mobx', (done) => {
//     const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
//     const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
//     const variables = { first: 1 };

//     const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
//     const variables2 = { first: 2 };

//     const networkInterface = mockNetworkInterface(
//       { request: { query, variables }, result: { data } },
//       { request: { query, variables: variables2 }, result: { data: data2 } }
//     );

//     const client = new ApolloClient({ networkInterface });

//     @observer
//     // @graphql(query)
//     class Container extends React.Component<any, any> {
//       componentDidMount() {
//         // console.log(this.props);
//         // if (this.props.appState.first === 0) this.props.appState.reset();
//       }
//       componentWillReceiveProps(nextProps) {
//         console.log(this.props, nextProps);
//         // if (nextProps.first === 1) this.props.dispatch({ type: 'INCREMENT' });
//         // if (nextProps.first === 2) {
//         //   if (nextProps.people.loading) return;
//         //   expect(nextProps.people.allPeople).to.deep.equal(data2.allPeople);
//         //   done();
//         // }
//       }
//       render() {
//         return <div>{this.props.appState.first}</div>;
//       }
//     };

//     const appState = new AppState();
//     mount(
//       <ProviderMock client={client}>
//         <Container appState={appState} />
//       </ProviderMock>
//     ) as any;

//   });

// });
