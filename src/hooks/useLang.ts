import * as langProvider from '../util/langProvider';
import useEffectOnce from './useEffectOnce';
import useForceUpdate from './useForceUpdate';

export type LangFn = langProvider.LangFn;

const useLang = (): LangFn => {
  const forceUpdate = useForceUpdate();
  const renderedTranslation = langProvider.getTranslation;

  useEffectOnce(() => {
    // The language pack can load between the first render and this subscription, and then nothing
    // would render the component again
    if (langProvider.getTranslation !== renderedTranslation) {
      forceUpdate();
    }

    return langProvider.addCallback(forceUpdate);
  });

  return langProvider.getTranslation;
};

export default useLang;
