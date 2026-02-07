
import enEN from './en-EN';



const locales = {
    available: () => {
        return {
            'en-EN': enEN,
           
            
        };
    },

    get: (locale) => {
        return locales.available()[locale];
    },

    has: (locale) => {
        return locales.available().hasOwnProperty(locale);
    },

    default: () => {
        return 'en-EN';
    }

}

export default locales;