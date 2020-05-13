export default class ScriptGrammar {

	/**
	 * Creates and returns a new script grammar instance.
	 *
	 * @param  {object}  options
	 *
	 * @return {this}
	 */
	constructor(options = {}) {

		this.columnResolver = options.columnResolver || function() { return null; };

	}

	/**
	 * Sets the column resolver for this grammar.
	 *
	 * @param  {function}
	 *
	 * @return {this}
	 */
	setColumnResolver(resolver) {

		this.columnResolver = resolver;

		return this;

	}

    /**
     * Compile the "where" portions of the query.
     *
     * @param  {object}  query
     *
     * @return {function}
     */
    compile(query) {

    	return this.compileWheres(query);

    }

    /**
     * Compile the "where" portions of the query.
     *
     * @param  {object}  query
     *
     * @return {function}
     */
    compileWheres(query) {

        // Each type of where clauses has its own compiler function which is responsible
        // for actually creating the where clauses SQL. This helps keep the code nice
        // and maintainable since each clause has a very small method that it uses.

        // Make sure the query has "where" clauses
        if(typeof query.wheres === 'undefined' || query.wheres.length == 0) {
        	return function() { return true };
        }

        // If we actually have some where clauses, we will strip off the first boolean
        // operator, which is added by the query builders for convenience so we can
        // avoid checking for the first clauses in each of the compilers methods.

        // Compile the wheres into an array
        let clauses = this.compileWheresToArray(query);

        // If there aren't any clauses, stop here
        if(clauses.length == 0) {
        	return function() { return true };
		}

		// Evaluate the clauses into a boolean
		return this.evaluateWhereClauses(query, clauses);

    }

    /**
     * Compiles the "where" portions of the query into an array of clauses.
     *
     * @param  {object}  query
     *
     * @return {array}
     */
	compileWheresToArray(query) {

		return query.wheres.map((where) => {

            let callback = this['where' + where.type]

            if(typeof callback === 'undefined') {
                console.error('Method ScriptGrammar::where' + where.type + '() is not defined.')
            }

            if(typeof callback !== 'function') {
                console.error('Method ScriptGrammar::where' + where.type + '() is not a function.')
            }

			return {
				'boolean': where.boolean,
				'callback': callback.call(this, query, where)
			};

		});

	}

	/**
	 * Evaluates the specified clauses into a boolean value.
	 *
	 * @param  {object}  query
	 * @param  {array}   clauses
	 *
	 * @return {function}
	 */
	evaluateWhereClauses(query, clauses) {

		return function() {

			return clauses.reduce(function(result, clause) {

				// Use the result of the first condition
				if(result === null) {
					return clause.callback();
				}

				// Determien the condition value
				let value = clause.callback();

				// Determine the result by the boolean
				switch(clause.boolean) {

					case 'and': return result && value;
					case 'or': return result || value;

				}

			}, null);

		};

	}

    /**
     * Compiles the specified basic where clause.
     *
     * @param  {object}  $query
     * @param  {object}  $where
     *
     * @return {function}
     */
    whereBasic(query, where) {

    	// Determine the value
        let value = where.value;

        // Determine the callback for the column value
        let column = this.column(where.column);

        // Determine the operator
        let operator = where.operator;

        // Determine the callback by the operator
        switch(operator) {

        	case '=' : return function() { return column() == value; }
        	case '!=': return function() { return column() != value; }
        	case '<>': return function() { return column() != value; }
        	case '>' : return function() { return column() >  value; }
        	case '>=': return function() { return column() >= value; }
        	case '<' : return function() { return column() <  value; }
        	case '<=': return function() { return column() <= value; }

        }

    }

    /**
     * Compiles the specified "where in" clause.
     *
     * @param  {object}  $query
     * @param  {object}  $where
     *
     * @return {function}
     */
    whereIn(query, where) {

        // Determine the values
        let values = where.values;

        // Determine the callback for the column value
        let column = this.column(where.column);

        // Return the evaluating callback
        return function() {
            return values.indexOf(column()) >= 0;
        }

    }

    /**
     * Compiles the specified "where not in" clause.
     *
     * @param  {object}  $query
     * @param  {object}  $where
     *
     * @return {function}
     */
    whereNotIn(query, where) {

        // Determine the values
        let values = where.values;

        // Determine the callback for the column value
        let column = this.column(where.column);

        // Return the evaluating callback
        return function() {
            return values.indexOf(column()) == -1;
        }

    }

    /**
     * Compiles the specified "where null" clause.
     *
     * @param  {object}  $query
     * @param  {object}  $where
     *
     * @return {function}
     */
    whereNull(query, where) {

        // Determine the callback for the column value
        let column = this.column(where.column);

        // Return the evaluating callback
        return function() {
            return ['', null].indexOf(column()) >= 0;
        }

    }

    /**
     * Compiles the specified "where not null" clause.
     *
     * @param  {object}  $query
     * @param  {object}  $where
     *
     * @return {function}
     */
    whereNotNull(query, where) {

        // Determine the callback for the column value
        let column = this.column(where.column);

        // Return the evaluating callback
        return function() {
            return ['', null].indexOf(column()) == -1;
        }

    }

    /**
     * Returns a callback for accessing the specified column.
     *
     * @param  {string}  name
     *
     * @return {function}
     */
    column(name) {

		return (function() {
			return this.columnResolver(name);
		}).bind(this);

    }

}