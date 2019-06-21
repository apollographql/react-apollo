# <a href="https://www.apollographql.com/"><img src="https://user-images.githubusercontent.com/841294/53402609-b97a2180-39ba-11e9-8100-812bab86357c.png" height="100" alt="React Apollo"></a>

## React Apollo - Hooks

[![npm version](https://badge.fury.io/js/%40apollo%2Freact-hooks.svg)](https://badge.fury.io/js/%40apollo%2Freact-hooks)
[![Build Status](https://circleci.com/gh/apollographql/react-apollo.svg?style=svg)](https://circleci.com/gh/apollographql/react-apollo)
[![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/apollo)

React Apollo [Hooks](https://reactjs.org/docs/hooks-intro.html).

> **NOTE:** Full React Apollo Hooks usage documentation is coming soon, and when ready will be made available in the main [React Apollo documentation](https://www.apollographql.com/docs/react/). The contents of this README are intended to help beta testers, and will change.

### Contents

1. [Installation](#installation)
2. [Hooks Overview](#hooks-overview)
  - [`useQuery`](#useQuery)
  - [`useMutation`](#useMutation)
  - [`useSubscription`](#useSubscription)
  - [`useApolloClient`](#useApolloClient)
3. [Reference]()

### Installation

```
npm install @apollo/react-hooks
```

### Hooks Overview

<a name="useQuery"></a>
#### a) [`useQuery`](https://github.com/apollographql/react-apollo/blob/release-3.0.0/packages/hooks/src/useQuery.ts)

**Function:**

```ts
export function useQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
): QueryResult<TData, TVariables>
```

**Options:**

```ts
query?: DocumentNode;
displayName?: string;
skip?: boolean;
onCompleted?: (data: TData) => void;
onError?: (error: ApolloError) => void;
ssr?: boolean;
variables?: TVariables;
fetchPolicy?: WatchQueryFetchPolicy;
errorPolicy?: ErrorPolicy;
pollInterval?: number;
client?: ApolloClient<any>;
notifyOnNetworkStatusChange?: boolean;
context?: Context;
partialRefetch?: boolean;
returnPartialData?: boolean
```

**Result:**

- client: ApolloClient<any>;
- data: TData | undefined;
- error?: ApolloError;
- loading: boolean;
- networkStatus: NetworkStatus;
- fetchMore: any;

**Example (from the [Hooks demo app](https://github.com/apollographql/react-apollo/tree/release-3.0.0/examples/hooks)):**

```jsx
const GET_ROCKET_INVENTORY = gql`
  query getRocketInventory {
    rocketInventory {
      id
      model
      year
      stock
    }
  }
`;

export function RocketInventoryList() {
  const { loading, data } = useQuery(GET_ROCKET_INVENTORY);
  return (
    <Row className="rocket-inventory-list mt-4">
      <Col sm="12">
        <h3>Available Inventory</h3>
        {loading ? (
          <p>Loading ...</p>
        ) : (
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Model</th>
                <th>Year</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.rocketInventory.map((inventory: RocketInventory) => (
                <tr
                  key={`${inventory.model}-${inventory.year}-${
                    inventory.stock
                  }`}
                >
                  <td>{inventory.model}</td>
                  <td>{inventory.year}</td>
                  <td>{inventory.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Col>
    </Row>
  );
}
```

<a name="useMutation"></a>
#### b) [`useMutation`](https://github.com/apollographql/react-apollo/blob/release-3.0.0/packages/hooks/src/useMutation.ts)

**Function:**

```ts
export function useMutation<TData = any, TVariables = OperationVariables>(
  mutation: DocumentNode,
  options?: MutationHookOptions<TData, TVariables>
): MutationTuple<TData, TVariables>
```

**Options:**

```ts
mutation?: DocumentNode;
variables?: TVariables;
optimisticResponse?: TData;
refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesFunction;
awaitRefetchQueries?: boolean;
errorPolicy?: ErrorPolicy;
update?: MutationUpdaterFn<TData>;
client?: ApolloClient<object>;
notifyOnNetworkStatusChange?: boolean;
context?: Context;
onCompleted?: (data: TData) => void;
onError?: (error: ApolloError) => void;
fetchPolicy?: WatchQueryFetchPolicy;
ignoreResults?: boolean;
```

**Result:**

```ts
[
  (
    options?: MutationFunctionOptions<TData, TVariables>
  ) => Promise<void | ExecutionResult<TData>>,
  {
    data?: TData;
    error?: ApolloError;
    loading: boolean;
    called: boolean;
    client?: ApolloClient<object>
  }
];
```

**Example (from the [Hooks demo app](https://github.com/apollographql/react-apollo/tree/release-3.0.0/examples/hooks)):**

```jsx
const SAVE_ROCKET = gql`
  mutation saveRocket($rocket: RocketInput!) {
    saveRocket(rocket: $rocket) {
      model
    }
  }
`;

export function NewRocketForm() {
  const [model, setModel] = useState('');
  const [year, setYear] = useState(0);
  const [stock, setStock] = useState(0);

  const [saveRocket, { error, data }] = useMutation<
    {
      saveRocket: RocketInventory;
    },
    { rocket: NewRocketDetails }
  >(SAVE_ROCKET, {
    variables: { rocket: { model: model, year: +year, stock: +stock } },
    refetchQueries: ['getRocketInventory']
  });

  return (
    <div className="new-rocket-form mt-3">
      <h3>Add a Rocket</h3>
      {error ? <Alert color="danger">Oh no! {error.message}</Alert> : null}
      {data && data.saveRocket ? (
        <Alert color="success">
          Model <strong>{data.saveRocket.model}</strong> added!
        </Alert>
      ) : null}
      <Form style={{ border: '1px solid #ddd', padding: '15px' }}>
        <Row>
          <Col sm="6">
            <FormGroup>
              <Label for="model">Model</Label>
              <Input
                type="text"
                name="model"
                id="model"
                onChange={e => setModel(e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col sm="3">
            <FormGroup>
              <Label for="year">Year</Label>
              <Input
                type="number"
                name="year"
                id="year"
                onChange={e => setYear(+e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col sm="3">
            <FormGroup>
              <Label for="stock">Stock</Label>
              <Input
                type="number"
                name="stock"
                id="stock"
                onChange={e => setStock(+e.target.value)}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col
            sm="12"
            className="text-right"
            onClick={e => {
              e.preventDefault();
              if (model && year && stock) {
                saveRocket();
              }
            }}
          >
            <Button>Add</Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
```

<a name="useSubscription"></a>
#### c) [`useSubscription`](https://github.com/apollographql/react-apollo/blob/release-3.0.0/packages/hooks/src/useSubscription.ts)

**Function:**

```ts
export function useSubscription<TData = any, TVariables = OperationVariables>(
  subscription: DocumentNode,
  options?: SubscriptionHookOptions<TData, TVariables>
)
```

**Options:**

```ts
subscription?: DocumentNode;
variables?: TVariables;
fetchPolicy?: FetchPolicy;
shouldResubscribe?: boolean | ((options: BaseSubscriptionOptions<TData, TVariables>) => boolean);
client?: ApolloClient<object>;
onSubscriptionData?: (options: OnSubscriptionDataOptions<TData>) => any;
onSubscriptionComplete?: () => void;
```

**Example (from the [Hooks demo app](https://github.com/apollographql/react-apollo/tree/release-3.0.0/examples/hooks)):**

```jsx
const LATEST_NEWS = gql`
  subscription getLatestNews {
    latestNews {
      content
    }
  }
`;

export function LatestNews() {
  const { loading, data } = useSubscription<News>(LATEST_NEWS);
  return (
    <Card className="bg-light">
      <CardBody>
        <CardTitle>
          <h5>Latest News</h5>
        </CardTitle>
        <CardText>{loading ? 'Loading...' : data!.latestNews.content}</CardText>
      </CardBody>
    </Card>
  );
}
```

<a name="useApolloClient"></a>
#### d) [`useApolloClient`](https://github.com/apollographql/react-apollo/blob/release-3.0.0/packages/hooks/src/useApolloClient.ts)

**Function:**

```ts
export function useApolloClient(): ApolloClient<object>
```

**Result:**

`ApolloClient` instance stored in the current Context.

**Example:**

```jsx
const client = useApolloClient();
consol.log('AC instance stored in the Context', client);
```

### Reference

- Main [Apollo Client / React Apollo documentation](https://www.apollographql.com/docs/react/)
- `useQuery`, `useMutation` and `useSubscription` [Hooks demo app](https://github.com/apollographql/react-apollo/tree/release-3.0.0/examples/hooks)
- Need help? Join us in the [Apollo Spectrum community](https://spectrum.chat/apollo)




