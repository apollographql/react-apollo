import React from 'react';
import renderer from 'react-test-renderer';
import { MockedProvider } from "../../../lib/src/test-utils";
import { print } from 'graphql-tag/printer';

import ArticlesWithData, { ARTICLE_QUERY, Articles, withArticles } from "./Articles";

const mockedData = {
  content: [
    {
      title: "Mollis Bibendum Vulputate Commodo",
      meta: {
        summary: "Maecenas faucibus mollis interdum. Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis."
      },
    },
    {
      title: "Ullamcorper Fusce Egestas",
      meta: {
        summary: "Maecenas faucibus mollis interdum. Donec sed odio dui. Donec id elit non mi porta gravida at eget metus. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Curabitur blandit tempus porttitor."
      },
    },
    {
      title: "Tristique Sollicitudin Tellus Bibendum Vehicula",
      meta: {
        summary: "Sed posuere consectetur est at lobortis. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Nulla vitae elit libero, a pharetra augue. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Nulla vitae elit libero, a pharetra augue. Vestibulum id ligula porta felis euismod semper."
      },
    },
  ],
};

describe('default export', () => {
  it('renders without crashing', () => {
    const output = renderer.create(
      <MockedProvider mocks={[{ request: { query: ARTICLE_QUERY }, result: { data: mockedData } }]}>
        <ArticlesWithData />
      </MockedProvider>
    )
    expect(output.toJSON()).toMatchSnapshot();
  });
});

describe('Article enhancer', () => {
  it('renders with loading first', (done) => {
    class Container extends React.Component {
      componentWillMount() {
        expect(this.props.data.loading).toBe(true);
        expect(this.props.data.content).toBeFalsy();
        done();
      }
      render() {
        return null;
      }
    };
    const ContainerWithData = withArticles(Container);
    const output = renderer.create(
      <MockedProvider mocks={[{ request: { query: ARTICLE_QUERY }, result: { data: mockedData } }]}>
        <ContainerWithData />
      </MockedProvider>
    );
  });

   it('renders data without crashing', (done) => {
    class Container extends React.Component {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.content).toEqual(mockedData.content);
        done();
      }
      render() {
        return null;
      }
    };
    const ContainerWithData = withArticles(Container);
    const output = renderer.create(
      <MockedProvider mocks={[{ request: { query: ARTICLE_QUERY }, result: { data: mockedData } }]}>
        <ContainerWithData />
      </MockedProvider>
    );
  });

});

describe('Article query', () => {
  it('should match expected structure', () => {
    expect(ARTICLE_QUERY).toMatchSnapshot();
  });

  it('should match expected shape', () => {
    expect(print(ARTICLE_QUERY)).toMatchSnapshot();
  });
});

describe('Articles Component', () => {
  it('should render a loading state without data', () => {
    const output = renderer.create(<Articles data={{ loading: true }} />)
    expect(output.toJSON()).toMatchSnapshot();
  });

  it('should render title and summary in order', () => {
    const output = renderer.create(
      <Articles data={{ loading: false, content: mockedData.content }} />
    );
    expect(output.toJSON()).toMatchSnapshot();
  });
});


