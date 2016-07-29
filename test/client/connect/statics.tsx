
// import * as React from 'react';
// import * as chai from 'chai';

// const { expect } = chai;

// import connect from '../../../src/connect';

// describe('statics', () => {
//   it('should be preserved', () => {
//     @connect({})
//     class ApolloContainer extends React.Component<any, any> {
//       static veryStatic = 'such global';
//     };

//     expect(ApolloContainer.veryStatic).to.eq('such global');
//   });

//   it('exposes a debuggable displayName', () => {
//     @connect({})
//     class ApolloContainer extends React.Component<any, any> {}

//     expect((ApolloContainer as any).displayName).to.eq('Connect(Apollo(ApolloContainer))');
//   });

//   it('honors custom display names', () => {
//     @connect({})
//     class ApolloContainer extends React.Component<any, any> {
//       static displayName = 'Foo';
//     }

//     expect((ApolloContainer as any).displayName).to.eq('Connect(Apollo(Foo))');
//   });
// });
