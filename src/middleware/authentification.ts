import  { Request, Response,NextFunction} from 'express';

async function authentification(req:Request, res:Response, next:NextFunction) {
    try {      
      const token = req.headers.authorization?.split(' ')[1];
      const decode = token === 'Fosan132@';
  
      if (decode) {
        next();
      } else {
        res.status(401).json({ status: 204, message: 'wrong token' });
      }
    } catch (err) {
      console.log(err);
      res.status(401).json({ status: 204, message: 'wrong token' });
    }
  }
  
export default authentification
  