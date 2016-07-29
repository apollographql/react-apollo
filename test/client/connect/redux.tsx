
// import * as React from 'react';
// import * as chai from 'chai';
// import { mount } from 'enzyme';
// import { createStore, combineReducers, applyMiddleware } from 'redux';
// import { connect as ReactReduxConnect } from 'react-redux';
// import assign = require('object-assign');

// import ApolloClient from 'apollo-client';

// declare function require(name: string);
// import chaiEnzyme = require('chai-enzyme');

// chai.use(chaiEnzyme()); // Note the invocation at the end
// const { expect } = chai;

// import {
//   Passthrough,
//   ProviderMock,
// } from '../../mocks/components';

// import connect from '../../../src/connect';

// describe('redux integration', () => {
//   it('should allow mapStateToProps', () => {
//     const store = createStore(() => ({
//       foo: 'bar',
//       baz: 42,
//       hello: 'world',
//     }));

//     const mapStateToProps = ({ foo, baz }) => ({ foo, baz });

//     @ReactReduxConnect(mapStateToProps)
//     class Container extends React.Component<any, any> {
//       render() {
//         return <Passthrough {...this.props} />;
//       }
//     };

//     @connect({mapStateToProps})
//     class ApolloContainer extends React.Component<any, any> {
//       render() {
//         return <Passthrough {...this.props} />;
//       }
//     };

//     const wrapper = mount(
//       <ProviderMock store={store} client={{}}>
//         <Container pass='through' baz={50} />
//       </ProviderMock>
//     );

//     const apolloWrapper = mount(
//       <ProviderMock store={store} client={{}}>
//         <ApolloContainer pass='through' baz={50} />
//       </ProviderMock>
//     );

//     const reduxProps = assign({}, wrapper.find('span').props());
//     const apolloProps = apolloWrapper.find('span').props();

//     expect(reduxProps).to.deep.equal(apolloProps);

//   });

//   it('updates child props on state change', (done) => {

//     const client = new ApolloClient();
//     let wrapper;

//     function mapStateToProps(state) {
//       return {
//         cntr: state.counter + 1
//       }
//     }

//     function counter(state = 1, action) {
//       switch (action.type) {
//         case 'INCREMENT':
//           return state + 1
//         default:
//           return state
//         }
//     }

//     // Typscript workaround
//     const apolloReducer = client.reducer() as () => any;

//     const store = createStore(
//       combineReducers({
//         counter,
//         apollo: apolloReducer
//       }),
//       applyMiddleware(client.middleware())
//     );

//     let hasDispatched = false;
//     @connect({ mapStateToProps })
//     class Container extends React.Component<any, any> {
//       componentWillMount() {
//         this.props.dispatch({ type: 'INCREMENT' });
//       }
//       componentWillReceiveProps(nextProps) {
//         expect(nextProps.cntr).to.equal(3);
//         done();
//       }
//       render() {
//         return <Passthrough {...this.props} />;
//       }
//     };

//     wrapper = mount(
//       <ProviderMock store={store} client={client}>
//         <Container pass='through' baz={50} />
//       </ProviderMock>
//     ) as any;

//   });

//   it('should allow mapDispatchToProps', () => {
//     function doSomething(thing) {
//       return {
//         type: 'APPEND',
//         body: thing,
//       };
//     };

//     const store = createStore(() => ({
//       foo: 'bar',
//       baz: 42,
//       hello: 'world',
//     }));

//     const mapDispatchToProps = dispatch => ({
//       doSomething: (whatever) => dispatch(doSomething(whatever)),
//     });

//     @ReactReduxConnect(null, mapDispatchToProps)
//     class Container extends React.Component<any, any> {
//       render() {
//         return <Passthrough {...this.props} />;
//       }
//     };

//     @connect({mapDispatchToProps})
//     class ApolloContainer extends React.Component<any, any> {
//       render() {
//         return <Passthrough {...this.props} />;
//       }
//     };

//     const wrapper = mount(
//       <ProviderMock store={store} client={{}}>
//         <Container pass='through' baz={50} />
//       </ProviderMock>
//     );

//     const apolloWrapper = mount(
//       <ProviderMock store={store} client={{}}>
//         <ApolloContainer pass='through' baz={50} />
//       </ProviderMock>
//     );

//     const reduxProps = assign({}, wrapper.find('span').props(), {
//       query: () => {/* tslint  */},
//       mutate: () => {/* tslint  */},
//     }) as any;
//     const apolloProps = apolloWrapper.find('span').props() as any;

//     expect(reduxProps.doSomething()).to.deep.equal(apolloProps.doSomething());

//   });

//   it('should allow mergeProps', () => {
//     function doSomething(thing) {
//       return {
//         type: 'APPEND',
//         body: thing,
//       };
//     };

//     const store = createStore(() => ({
//       foo: 'bar',
//       baz: 42,
//       hello: 'world',
//     }));

//     const mapStateToProps = ({ foo, baz }) => ({ foo, baz });

//     const mapDispatchToProps = dispatch => ({
//       doSomething: (whatever) => dispatch(doSomething(whatever)),
//     });

//     const mergeProps = (stateProps, dispatchProps, ownProps) => {
//       return {
//         bar: stateProps.baz + 1,
//         makeSomething: dispatchProps.doSomething,
//         hallPass: ownProps.pass,
//       };
//     };

//     @ReactReduxConnect(mapStateToProps, mapDispatchToProps, mergeProps)
//     class Container extends React.Component<any, any> {
//       render() {
//         return <Passthrough {...this.props} />;
//       }
//     };

//     @connect({mapStateToProps, mapDispatchToProps, mergeProps})
//     class ApolloContainer extends React.Component<any, any> {
//       render() {
//         return <Passthrough {...this.props} />;
//       }
//     };

//     const wrapper = mount(
//       <ProviderMock store={store} client={{}}>
//         <Container pass='through' baz={50} />
//       </ProviderMock>
//     );

//     const apolloWrapper = mount(
//       <ProviderMock store={store} client={{}}>
//         <ApolloContainer pass='through' baz={50} />
//       </ProviderMock>
//     );

//     const reduxProps = assign({}, wrapper.find('span').props(), {
//       query: () => {/* tslint  */},
//       mutate: () => {/* tslint  */},
//     }) as any;
//     const apolloProps = apolloWrapper.find('span').props() as any;

//     expect(reduxProps.makeSomething()).to.deep.equal(apolloProps.makeSomething());
//     expect(reduxProps.bar).to.equal(apolloProps.bar);
//     expect(reduxProps.hallPass).to.equal(apolloProps.hallPass);

//   });
// });
