import frFR from './fr-FR';
import enEN from './en-EN';


const locales = {
    available: () => {
        return {
            'en-EN': enEN,
            'fr-FR': frFR,
            
        };
    },

    get: (locale) => {
        return locales.available()[locale];
    },

    has: (locale) => {
        return locales.available().hasOwnProperty(locale);
    },

    default: () => {
        return 'fr-FR';
    }

}

export default locales;