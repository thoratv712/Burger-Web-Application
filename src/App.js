import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const menuItems = [
  {
    id: 1,
    name: 'Smoky Stack',
    description: 'Double patty, smoked cheddar, grilled onions, house sauce.',
    price: 229,
    tag: 'Popular',
  },
  {
    id: 2,
    name: 'Garden Crunch',
    description: 'Crispy veg patty, lettuce, pickles, tomato, mint mayo.',
    price: 179,
    tag: 'Veg',
  },
  {
    id: 3,
    name: 'Firehouse Melt',
    description: 'Spicy patty, jalapenos, pepper jack, chilli glaze.',
    price: 249,
    tag: 'Spicy',
  },
];

const addOns = [
  { id: 'cheese', name: 'Extra cheese', price: 35 },
  { id: 'fries', name: 'Fries combo', price: 79 },
  { id: 'drink', name: 'Cold drink', price: 59 },
];

const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const savedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('burgerUser'));
  } catch {
    return null;
  }
};

function App() {
  const deliveryRef = useRef(null);
  const [user, setUser] = useState(savedUser);
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [authError, setAuthError] = useState('');
  const [showDelivery, setShowDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    address: '',
    city: '',
    phone: '',
  });
  const [deliveryError, setDeliveryError] = useState('');
  const [showAddressReview, setShowAddressReview] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [selectedBurger, setSelectedBurger] = useState(menuItems[0]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState(['cheese']);

  const addOnsTotal = useMemo(
    () =>
      addOns
        .filter((item) => selectedAddOns.includes(item.id))
        .reduce((total, item) => total + item.price, 0),
    [selectedAddOns]
  );

  const subtotal = (selectedBurger.price + addOnsTotal) * quantity;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (showDelivery) {
      deliveryRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [showDelivery]);

  const toggleAddOn = (id) => {
    setSelectedAddOns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
    setAuthError('');
  };

  const handleDeliveryChange = (event) => {
    const { name, value } = event.target;
    setDeliveryForm((current) => ({ ...current, [name]: value }));
    setDeliveryError('');
  };

  const handleLogin = (event) => {
    event.preventDefault();

    if (!authForm.name.trim() || !authForm.email.trim() || !authForm.password.trim()) {
      setAuthError('Please fill in all fields to continue.');
      return;
    }

    if (!authForm.email.includes('@')) {
      setAuthError('Enter a valid email address.');
      return;
    }

    if (authForm.password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    const nextUser = {
      name: authForm.name.trim(),
      email: authForm.email.trim(),
    };

    localStorage.setItem('burgerUser', JSON.stringify(nextUser));
    setUser(nextUser);
    setAuthForm({ name: '', email: '', password: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('burgerUser');
    setUser(null);
    setShowDelivery(false);
    setShowAddressReview(false);
    setOrderConfirmed(false);
    setDeliveryError('');
    setLocation(null);
    setLocationAddress('');
    setLocationStatus('');
  };

  const handlePlaceOrder = () => {
    setShowDelivery(true);

    if (showDelivery) {
      deliveryRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyResolvedAddress = (address) => {
    setLocationAddress(address);
    setDeliveryForm((current) => ({
      ...current,
      address: address || current.address,
    }));
  };

  const reverseGeocodeLocation = async (latitude, longitude) => {
    if (googleMapsApiKey) {
      const googleResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`
      );
      const googleData = await googleResponse.json();
      const googleAddress = googleData.results?.[0]?.formatted_address;

      if (googleAddress) {
        return googleAddress;
      }
    }

    const fallbackResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );
    const fallbackData = await fallbackResponse.json();
    return fallbackData.display_name || '';
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location access is not supported in this browser.');
      return;
    }

    setLocationStatus('Requesting your location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocation({
          latitude,
          longitude,
        });
        setLocationAddress('');
        setLocationStatus('Location found. Getting readable address...');

        try {
          const resolvedAddress = await reverseGeocodeLocation(latitude, longitude);

          if (resolvedAddress) {
            applyResolvedAddress(resolvedAddress);
            setLocationStatus('Address found from your live location.');
          } else {
            setDeliveryForm((current) => ({
              ...current,
              address: current.address || 'Live location shared from browser',
            }));
            setLocationStatus('Location found, but address lookup did not return a full address.');
          }
        } catch {
          setDeliveryForm((current) => ({
            ...current,
            address: current.address || 'Live location shared from browser',
          }));
          setLocationStatus('Location found, but address lookup failed. Please check the address.');
        }
      },
      () => {
        setLocationStatus('Location permission was blocked. Please enter your address.');
      }
    );
  };

  const validateDelivery = () => {
    if (!deliveryForm.address.trim() || !deliveryForm.city.trim() || !deliveryForm.phone.trim()) {
      setDeliveryError('Please complete street address, city, and phone number.');
      return false;
    }

    if (!/^[0-9+\-\s]{8,15}$/.test(deliveryForm.phone.trim())) {
      setDeliveryError('Please enter a valid delivery phone number.');
      return false;
    }

    setDeliveryError('');
    return true;
  };

  const handleReviewAddress = () => {
    if (validateDelivery()) {
      setShowAddressReview(true);
    }
  };

  const handleConfirmOrder = () => {
    setShowAddressReview(false);
    setOrderConfirmed(true);
  };

  return (
    <main className="app">
      <section className="hero">
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark">B</span>
            <span>Burger House</span>
          </div>

          {isAuthenticated ? (
            <div className="account-bar">
              <span>Hi, {user.name}</span>
              <button className="nav-button" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          ) : (
            <a href="#login" className="nav-button">
              Login
            </a>
          )}
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Fresh burgers, fast checkout</p>
            <h1>Build a burger worth pausing for.</h1>
            <p>
              Sign in, choose a signature stack, add your favorite sides, and see the
              total update instantly before you place your order.
            </p>
            <div className="hero-actions">
              {isAuthenticated ? (
                <>
                  <a href="#menu" className="primary-button">
                    View menu
                  </a>
                  <a href="#order" className="secondary-button">
                    Customize
                  </a>
                </>
              ) : (
                <a href="#login" className="primary-button">
                  Login to order
                </a>
              )}
            </div>
          </div>

          {isAuthenticated ? (
            <div className="burger-visual" aria-label="Illustration of a burger">
              <span className="bun bun-top" />
              <span className="cheese" />
              <span className="patty" />
              <span className="lettuce" />
              <span className="tomato" />
              <span className="bun bun-bottom" />
            </div>
          ) : (
            <form className="auth-card" id="login" onSubmit={handleLogin}>
              <p className="eyebrow">Login</p>
              <h2>Access your order</h2>
              <p className="muted">
                Create a quick local session to unlock the burger menu and checkout.
              </p>

              <label>
                Name
                <input
                  name="name"
                  onChange={handleAuthChange}
                  placeholder="Your name"
                  type="text"
                  value={authForm.name}
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  type="email"
                  value={authForm.email}
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  onChange={handleAuthChange}
                  placeholder="At least 6 characters"
                  type="password"
                  value={authForm.password}
                />
              </label>

              {authError && <p className="auth-error">{authError}</p>}

              <button className="checkout-button" type="submit">
                Login
              </button>
            </form>
          )}
        </div>
      </section>

      {isAuthenticated ? (
        <>
          <section className="section" id="menu">
            <div className="section-heading">
              <p className="eyebrow">Menu</p>
              <h2>Signature burgers</h2>
            </div>

            <div className="menu-grid">
              {menuItems.map((item) => (
                <button
                  className={`menu-card ${selectedBurger.id === item.id ? 'active' : ''}`}
                  key={item.id}
                  onClick={() => setSelectedBurger(item)}
                  type="button"
                >
                  <span className="tag">{item.tag}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <strong>Rs {item.price}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="section order-section" id="order">
            <div className="builder">
              <div>
                <p className="eyebrow">Customize</p>
                <h2>{selectedBurger.name}</h2>
                <p className="muted">{selectedBurger.description}</p>
              </div>

              <div className="quantity-row">
                <span>Quantity</span>
                <div className="stepper">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    -
                  </button>
                  <strong>{quantity}</strong>
                  <button type="button" onClick={() => setQuantity(quantity + 1)}>
                    +
                  </button>
                </div>
              </div>

              <div className="addons">
                {addOns.map((item) => (
                  <label key={item.id} className="addon">
                    <input
                      checked={selectedAddOns.includes(item.id)}
                      onChange={() => toggleAddOn(item.id)}
                      type="checkbox"
                    />
                    <span>{item.name}</span>
                    <strong>Rs {item.price}</strong>
                  </label>
                ))}
              </div>
            </div>

            <aside className="summary">
              <p className="eyebrow">Bill</p>
              <h2>Order summary</h2>
              <div className="summary-line">
                <span>Burger</span>
                <strong>Rs {selectedBurger.price * quantity}</strong>
              </div>
              <div className="summary-line">
                <span>Add-ons</span>
                <strong>Rs {addOnsTotal * quantity}</strong>
              </div>
              <div className="summary-line">
                <span>Tax</span>
                <strong>Rs {tax}</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>Rs {total}</strong>
              </div>
              <button
                className="checkout-button"
                onClick={handlePlaceOrder}
                type="button"
              >
                {showDelivery ? 'Delivery details opened' : 'Place order'}
              </button>
              {showDelivery && (
                <p className="summary-note">Add your delivery details below.</p>
              )}
            </aside>
          </section>

          {showDelivery && (
            <section className="section delivery-section" id="delivery" ref={deliveryRef}>
              <div className="delivery-copy">
                <p className="eyebrow">Delivery</p>
                <h2>Where should we bring it?</h2>
                <p className="muted">
                  Add your address manually or share your current location. If you share
                  location, a Google Maps link will appear for confirmation.
                </p>
              </div>

              <div className="delivery-panel">
                <div className="address-card">
                  <h3>Address details</h3>
                  <label>
                    Street address
                    <input
                      name="address"
                      onChange={handleDeliveryChange}
                      placeholder="Flat, street, landmark"
                      required
                      type="text"
                      value={deliveryForm.address}
                    />
                  </label>
                  <label>
                    City
                    <input
                      name="city"
                      onChange={handleDeliveryChange}
                      placeholder="Your city"
                      required
                      type="text"
                      value={deliveryForm.city}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      name="phone"
                      onChange={handleDeliveryChange}
                      placeholder="Delivery contact number"
                      required
                      type="tel"
                      value={deliveryForm.phone}
                    />
                  </label>
                </div>

                <div className="map-card">
                  <h3>Use live location</h3>
                  <p className="muted">
                    Allow browser location access to attach your current coordinates.
                  </p>
                  <button className="secondary-button" onClick={requestLocation} type="button">
                    Use my location
                  </button>
                  {locationStatus && <p className="location-status">{locationStatus}</p>}
                  {location && (
                    <div className="location-card">
                      <span>Selected live location</span>
                      {locationAddress && <p>{locationAddress}</p>}
                      <strong>
                        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                      </strong>
                      <a
                        className="map-link"
                        href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open location in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {deliveryError && <p className="auth-error delivery-error">{deliveryError}</p>}

              <button
                className="checkout-button confirm-button"
                onClick={handleReviewAddress}
                type="button"
              >
                Review address
              </button>
            </section>
          )}
        </>
      ) : (
        <section className="section locked-section">
          <p className="eyebrow">Protected</p>
          <h2>Login required</h2>
          <p className="muted">
            Your menu, customizations, and checkout stay hidden until authentication is
            complete.
          </p>
        </section>
      )}

      {showAddressReview && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="order-modal">
            <p className="eyebrow">Confirm address</p>
            <h2>Recheck delivery details</h2>
            <div className="review-list">
              <div>
                <span>Name</span>
                <strong>{user.name}</strong>
              </div>
              <div>
                <span>Address</span>
                <strong>{deliveryForm.address}</strong>
              </div>
              <div>
                <span>City</span>
                <strong>{deliveryForm.city}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{deliveryForm.phone}</strong>
              </div>
              {location && (
                <div>
                  <span>Live location</span>
                  <strong>
                    {locationAddress ||
                      `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                  </strong>
                </div>
              )}
              <div>
                <span>Payable amount</span>
                <strong>Rs {total}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setShowAddressReview(false)}
                type="button"
              >
                Edit address
              </button>
              <button className="checkout-button" onClick={handleConfirmOrder} type="button">
                Confirm order
              </button>
            </div>
          </div>
        </div>
      )}

      {orderConfirmed && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="order-modal success-modal">
            <p className="eyebrow">Order confirmed</p>
            <h2>Congratulations!</h2>
            <p className="muted">
              Your order is confirmed. You will get your burger soon.
            </p>
            <button
              className="checkout-button"
              onClick={() => setOrderConfirmed(false)}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
