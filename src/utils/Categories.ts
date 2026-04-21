import { MdStorefront} from "react-icons/md";
import { GiBamboo,GiCoconuts,GiGrass } from "react-icons/gi";
import { IoIosBasket } from "react-icons/io";
import { IoBagCheckOutline } from "react-icons/io5";
import { MdGrass } from "react-icons/md";

export const categories = [
  {
    label: "All",
    icon: MdStorefront,
  },
  {
    label: "BambooBag",
    icon: IoBagCheckOutline,
  },
  {
    label: "Decorative",
    icon: IoIosBasket,
  },
  {
    label: "Bamboo",
    icon: GiBamboo,
  },
  {
    label: "Rattan",
    icon: MdGrass,
  },
  {
    label: "Seagrass",
    icon: GiGrass,
  },
  {
    label: "Coconut",
    icon: GiCoconuts,
  },
  
];
