'use strict'

var QueryMissingFieldException = require('./Exceptions/QueryMissingFieldException');
var QueryTypeException = require('./Exceptions/QueryTypeException');
var QueryEmptyException = require('./Exceptions/QueryEmptyException');
var moment = require('moment');

/**
 * QueryBuilder: For constructing advanced serviceNOW queries
 */

class QueryBuilder{

    constructor(){
        this.query = [];
        this.currentField = '';
    }

    /**
     * Sets the field to operate on
     * 
     * @param {String} fieldName 
     */
    field(fieldName){
        this.currentField = fieldName;
        return this;
    }

    /**
     * Sets ordering of field to descending
     */
    orderDescending(){
        this.query.push('ORDERBYDESC' + this.currentField);
        return this;
    }

    /**
     * Sets ordering of field to ascending
     */
    orderAscending(){
        this.query.push('ORDERBY' + this.currentField);
        return this;
    }
    
    /**
     * Adds new STARTSWITH condition
     * 
     * @param {String} startsWithStr 
     */
    startsWith(startsWithStr){
        return this._addCondition('STARTSWITH', startsWithStr, ['string']);
    }

    /**
     * Adds new ENDSWITH condition
     * 
     * @param {String} endsWithStr 
     */
    endsWith(endsWithStr){
        return this._addCondition('ENDSWITH', endsWithStr, ['string']);;
    }

    /**
     * Adds new LIKE condition
     * 
     * @param {String} containesStr 
     */
    contains(containesStr){
        return this._addCondition('LIKE', containesStr, ['string']);
    }

    /**
     * Adds new NOTLIKE condition
     * 
     * @param {String} notContainesStr 
     */
    doesNotContain(notContainesStr){
        return this._addCondition('NOTLIKE', notContainesStr, ['string']);
    }

    /**
     * Adds new ISEMPTY condition
     */
    isEmpty(){
        return this._addCondition('ISEMPTY', '', ['string', 'number']);
    }

    /**
     * Adds new ISNOTEMPTY condition
     */
    isNotEmpty(){
        return this._addCondition('ISNOTEMPTY', '', ['string', 'number']);
    }

    /**
     * Adds new equality condition
     * 
     * @param {String} data 
     */
    equals(data){
        if (typeof data == 'string' || typeof data == 'number'){
            return this._addCondition('=', data, ['string', 'number']);
        } else if (Array.isArray(data)){
            return this._addCondition('IN', data, ['object']);
        }

        throw new QueryTypeException('Expected string or list type, found: ' + typeof data);
    }

    /**
     * Adds new non equality condition
     * 
     * @param {String} data 
     */
    notEquals(data){
        if (typeof data == 'string' || typeof data == 'number'){
            return this._addCondition('!=', data, ['string', 'number']);
        } else if (Array.isArray(data)){
            return this._addCondition('NOT IN', data, ['object']);
        }

        throw new QueryTypeException('Expected string or list type, found: ' + typeof data);
    }

    /**
     * Adds new '>' condition
     * 
     * @param {String} greaterThanValue 
     */
    greaterThan(greaterThanValue){
        return this._addComparisonCondition(greaterThanValue, '>');
    }

    /**
     * Adds new '>=' condition
     * 
     * @param {String} greaterThanOrIsValue 
     */
    greaterThanOrIs(greaterThanOrIsValue){
        return this._addComparisonCondition(greaterThanOrIsValue, '>=');
    }

    /**
     * Adds new '<' condition
     * 
     * @param {String} lessThanValue 
     */
    lessThan(lessThanValue){
        return this._addComparisonCondition(lessThanValue, '<');
    }

    /**
     * Adds new '<=' condition
     * 
     * @param {String} lessThanOrIsValue 
     */
    lessThanOrIs(lessThanOrIsValue){
        return this._addComparisonCondition(lessThanOrIsValue, '<=');
    }

    /**
     * Adds new 'BETWEEN' condition
     * 
     * @param {String} startValue 
     * @param {String} endValue 
     */
    between(startValue, endValue){
        var betweenOperand = '';
        if ((typeof startValue == 'number' && typeof endValue == 'number') 
                        || (typeof startValue == 'string' && typeof endValue == 'string')){

            betweenOperand = `${startValue}@${endValue}`;
        } else if ((startValue instanceof Date || startValue instanceof moment)
                        && (endValue instanceof Date || endValue instanceof moment)){

            betweenOperand = `${this._getDateTimeInUTC(startValue)}@${this._getDateTimeInUTC(endValue)}`;
        } else {
            throw new QueryTypeException('Expected string/date/number type, found: ' + typeof data);
        }
        
        return this._addCondition('BETWEEN', betweenOperand, ['string']);
    }

    /**
     * Adds new 'ANYTHING' condition
     */
    isAnything(){
        return this._addCondition('ANYTHING', '', ['string', 'number']);
    }

    /**
     * Adds new 'IN' condition
     * 
     * @param {Object} data Array to be searched 
     */
    isOneOf(data){
        if (Array.isArray(data)){
            return this._addCondition('IN', data.join(','), ['string']);
        }
        throw new QueryTypeException('Expected array type, found: ' + typeof data);
    }

    /**
     * Adds new 'EMPTYSTRING' condition
     */
    isEmptyString(){
        return this._addCondition('EMPTYSTRING', '', ['string']);
    }

    /**
     * Adds AND operator
     */
    and(){
        return this._addLogicalOperator('^');
    }

    /**
     * Addds OR operator
     */
    or(){
        return this._addLogicalOperator('^OR');
    }

    /**
     * Adds new NQ operator
     */
    NQ(){
        return this._addLogicalOperator('^NQ');
    }

    /**
     * Adds logical operator to current query string
     * 
     * @param {String} operator 
     */
    _addLogicalOperator(operator){
        this.query.push(operator);
        return this;
    }

    /**
     * Adds new condition to current query string 
     * 
     * @param {String} operator 
     * @param {String} operand 
     * @param {List} types 
     */
    _addCondition(operator, operand, types){
        if (!this.currentField){
            throw new QueryMissingFieldException('Conditions requires a field.');
        }
        
        if (!types.includes(typeof operand)){
            var errorMessage = '';
            if (types.length > 1){
                errorMessage = 'Invalid type passed. Expected one of: ' + types;
            } else {
                errorMessage = 'Invalid type passed. Expected: ' + types;
            }
            throw new QueryTypeException(errorMessage);
        }

        this.query.push(this.currentField + operator + operand);
        return this;
    }

    /**
     * Builds serviceNOW readable the query.
     * 
     * @returns {String} encoded serviceNOW query
     */
    build(){
        if (this.query.length == 0){
            throw new QueryEmptyException('Atleast one condition is required in query.');
        }
        return this.query.join('');
    }

    /**
     * Converts date/moment object to UTC and formats to ServiceNOW readable date string.
     * Also supports moment date objects
     * 
     * @param {Object} dateTime 
     * 
     * @returns {String} formatted Date-Time String
     * 
     */
    _getDateTimeInUTC(dateTime){
        //Support of Moment Date object
        if (dateTime instanceof moment){
            return this._formatDateTime(dateTime);
        }
        return this._formatDateTime(moment(new Date(dateTime.toUTCString().substr(0, 25))));
    }

    /**
     * Formats serviceNOW readable date
     * 
     * @param {moment} momentDate 
     * 
     * @returns {String} formatted date string
     * 
     */
    _formatDateTime(momentDate){
        return momentDate.format('YYYY-MM-DD hh:mm:ss').toString();
    }

    /**
     * Adds comparison conditions {'>', '<', '>=', '<='}
     * 
     * @param {String} valueToCompare 
     * @param {String} operator 
     */
    _addComparisonCondition(valueToCompare, operator){
        if (valueToCompare instanceof Date || valueToCompare instanceof moment){
            valueToCompare = this._getDateTimeInUTC(valueToCompare);
        } else if (!(typeof valueToCompare == 'number' || typeof valueToCompare == 'string')){
            throw new QueryTypeException('Expected string/Date/number type, found: ' + typeof valueToCompare);
        }
        return this._addCondition(operator, valueToCompare, ['number', 'string']);
    }
}

module.exports = QueryBuilder;