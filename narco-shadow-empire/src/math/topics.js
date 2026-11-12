// The 20 ASVAB topics (ids are fixed - see docs/ARCHITECTURE.md 7.2) and the 5 difficulty levels. Pure module.
import { L } from '../core/ltext.js';

const T = (id, name, short, blurb) => Object.freeze({ id, section: id.startsWith('mk.') ? 'MK' : 'AR', name, short, blurb });
export const TOPICS = Object.freeze([
  T('ar.word', L('Word problems', 'Problemas verbales'), L('Word', 'Verbal'), L('Turn a written situation into an equation.', 'Convierte una situación escrita en una ecuación.')),
  T('ar.ops', L('Operations (+ − × ÷)', 'Operaciones (+ − × ÷)'), L('Operations', 'Operaciones'), L('Add, subtract, multiply and divide whole numbers in context.', 'Suma, resta, multiplica y divide números enteros en contexto.')),
  T('ar.fracdec', L('Fractions and decimals', 'Fracciones y decimales'), L('Fractions', 'Fracciones'), L('Parts of a whole, fraction operations and decimal amounts.', 'Partes de un todo, operaciones con fracciones y cantidades decimales.')),
  T('ar.percent', L('Percent and discounts', 'Porcentajes y descuentos'), L('Percent', 'Porcentaje'), L('Percent of a number, discounts, tax, tip, percent change and simple interest.', 'Porcentaje de un número, descuentos, impuestos, propinas, cambio porcentual e interés simple.')),
  T('ar.ratio', L('Ratios and proportions', 'Razones y proporciones'), L('Ratios', 'Razones'), L('Compare quantities, unit rates and solve proportions.', 'Compara cantidades, tasas unitarias y resuelve proporciones.')),
  T('ar.drt', L('Distance, rate and time', 'Distancia, velocidad y tiempo'), L('D = R × T', 'D = V × T'), L('Travel problems with distance = rate × time.', 'Problemas de viaje con distancia = velocidad × tiempo.')),
  T('ar.avg', L('Averages', 'Promedios'), L('Averages', 'Promedios'), L('Mean of a set, missing values and weighted averages.', 'Media de un conjunto, valores faltantes y promedios ponderados.')),
  T('ar.work', L('Work rate', 'Ritmo de trabajo'), L('Work', 'Trabajo'), L('How long a job takes alone or together.', 'Cuánto tarda un trabajo a solas o en equipo.')),
  T('ar.units', L('Unit conversions', 'Conversión de unidades'), L('Units', 'Unidades'), L('Convert length, weight, volume, time and temperature.', 'Convierte longitud, peso, volumen, tiempo y temperatura.')),
  T('ar.multi', L('Multi-step reasoning', 'Razonamiento de varios pasos'), L('Multi-step', 'Varios pasos'), L('Chain several operations to reach one answer.', 'Encadena varias operaciones para llegar a una respuesta.')),
  T('mk.order', L('Order of operations', 'Orden de las operaciones'), L('PEMDAS', 'PEMDAS'), L('Parentheses, exponents, multiply/divide, add/subtract.', 'Paréntesis, exponentes, multiplicar/dividir, sumar/restar.')),
  T('mk.linear', L('Linear equations', 'Ecuaciones lineales'), L('Equations', 'Ecuaciones'), L('Solve for x by undoing operations on both sides.', 'Despeja x deshaciendo operaciones en ambos lados.')),
  T('mk.expr', L('Algebraic expressions', 'Expresiones algebraicas'), L('Expressions', 'Expresiones'), L('Evaluate, simplify and combine like terms.', 'Evalúa, simplifica y combina términos semejantes.')),
  T('mk.exp', L('Exponents and roots', 'Exponentes y raíces'), L('Exponents', 'Exponentes'), L('Powers, exponent rules and square roots.', 'Potencias, reglas de exponentes y raíces cuadradas.')),
  T('mk.ineq', L('Inequalities', 'Desigualdades'), L('Inequalities', 'Desigualdades'), L('Solve and read inequalities; flip the sign when dividing by a negative.', 'Resuelve e interpreta desigualdades; invierte el signo al dividir entre un negativo.')),
  T('mk.geom', L('Geometry', 'Geometría'), L('Geometry', 'Geometría'), L('Shapes, circles and coordinate basics.', 'Figuras, círculos y nociones de coordenadas.')),
  T('mk.pav', L('Perimeter, area and volume', 'Perímetro, área y volumen'), L('Area', 'Área'), L('Measure around, across and inside figures and solids.', 'Mide el contorno, la superficie y el interior de figuras y sólidos.')),
  T('mk.angles', L('Angles and triangles', 'Ángulos y triángulos'), L('Angles', 'Ángulos'), L('Angle relationships, triangle sums and the Pythagorean theorem.', 'Relaciones entre ángulos, suma de triángulos y el teorema de Pitágoras.')),
  T('mk.factor', L('Factoring and polynomials', 'Factorización y polinomios'), L('Factoring', 'Factorizar'), L('FOIL, common factors and factoring quadratics.', 'FOIL, factores comunes y factorización de cuadráticas.')),
  T('mk.props', L('Properties, formulas and patterns', 'Propiedades, fórmulas y patrones'), L('Properties', 'Propiedades'), L('Number properties, primes, LCM/GCF and number patterns.', 'Propiedades numéricas, primos, MCM/MCD y patrones numéricos.')),
]);

export const LEVELS = Object.freeze([
  { level: 1, name: L('Recruit', 'Recluta'), blurb: L('Foundational arithmetic.', 'Aritmética fundamental.') },
  { level: 2, name: L('Specialist', 'Especialista'), blurb: L('Basic multi-step applications.', 'Aplicaciones básicas de varios pasos.') },
  { level: 3, name: L('Operator', 'Operador'), blurb: L('Intermediate algebra and geometry.', 'Álgebra y geometría intermedias.') },
  { level: 4, name: L('Advanced Operator', 'Operador Avanzado'), blurb: L('Difficult mixed problems.', 'Problemas mixtos difíciles.') },
  { level: 5, name: L('ASVAB Readiness', 'Preparación ASVAB'), blurb: L('Timed exam-style questions.', 'Preguntas cronometradas estilo examen.') },
]);
