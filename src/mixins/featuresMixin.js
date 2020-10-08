import gql from 'graphql-tag';
import cartMixin from './cartMixin';
import CART_FRAGMENT from '../components/Cart.gql';
import MONEY_FRAGMENT from '../components/Money.gql';
import ADDRESS_FRAGMENT from '../components/Address.gql';
import { locale } from '../components/common/shared';

const getFeaturesUsed = (features, featuresUsedIds, featureToAdd) => {
  // find featureToAdd in our list of features
  if (Array.isArray(features)) {
    const featureId = features.reduce((acc, feature) => {
      const { id, key } = feature || {};
      return key === featureToAdd ? id : acc;
    }, null);

    // report this feature as being used if we've not done so yet
    if (!featuresUsedIds.includes(featureId)) {
      const featuresUsed = featuresUsedIds.concat(featureId);
      const featuresFormatted = featuresUsed.map((featureUsedId) =>
        (`{ \"typeId\": \"key-value-document\",  \"id\": \"${featureUsedId}\"}`)); //eslint-disable-line
      return `[${featuresFormatted.join(',')}]`;
    }
  }
  return null;
};

export default {
  mixins: [cartMixin],

  data: () => ({
    customObjects: null,
  }),

  computed: {
    features() {
      return this.customObjects?.results;
    },

    featuresUsedIds() {
      if (this.cartExists) {
        const { customFieldsRaw = [] } = this.me?.activeCart || {};
        if (Array.isArray(customFieldsRaw)) {
          const features = customFieldsRaw.find((cf) => cf.name === 'features');
          const { value: featuresUsed = [] } = features || {};
          return featuresUsed.reduce((acc, v) => acc.concat(v.id), []);
        }
      }
      return [];
    },

    featuresUsedNames() {
      if (this.featuresUsedIds && this.features) {
        return this.features.reduce((acc, feature) => {
          const { id, value } = feature || {};
          if (this.featuresUsedIds.includes(id)) {
            const { name, description } = value || {};
            return acc.concat({ id, name, description });
          }
          return acc;
        }, []);
      }
      return [];
    },
  },

  methods: {
    async updateFeaturesUsed(featureToAdd) {
      if (!this.cartExists) {
        await this.createMyCart({
          currency: this.$store.state.currency,
          country: this.$store.state.country,
          shippingAddress: { country: this.$store.state.country },
        });
      }

      const featuresUsed = getFeaturesUsed(this.features, this.featuresUsedIds, featureToAdd);
      if (featuresUsed) {
        return this.updateMyCart({
          setCustomType: {
            type: { key: 'features-used', typeId: 'type' },
            fields: {
              name: 'features',
              value: featuresUsed,
            },
          },
        });
      }
      return Promise.resolve();
    },
  },

  apollo: {
    me: {
      query: gql`
        query me($locale: Locale!) {
          me {
            activeCart {
              ...CartFields
            }
          }
        }
        ${CART_FRAGMENT}
        ${MONEY_FRAGMENT}
        ${ADDRESS_FRAGMENT}`,
      variables() {
        return {
          locale: locale(this),
        };
      },
    },

    customObjects: {
      query: gql`
        query CustomObject($container: String!) {
          customObjects(container: $container) {
            results {
              container
              key
              value
              id
            }
          }
        }`,
      variables() {
        return {
          container: 'features',
        };
      },
    },
  },
};
